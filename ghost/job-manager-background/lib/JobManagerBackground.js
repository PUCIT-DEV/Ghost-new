const workerpool = require('workerpool');
const path = require('path');
const JobsRepository = require('./jobsRepository');

/**
 * @class JobManagerBackground
 * @description Manages background jobs using a worker pool and job repository.
 */
class JobManagerBackground {
    #testMode = true;
    
    /**
     * @constructor
     * @param {Object} options - Configuration options for the job manager.
     * @param {Object} [options.JobModel] - A model which can persist job data in storage.
     */
    constructor({JobModel}) {
        this.pool = workerpool.pool(path.join(__dirname, '/workers/generic-worker.js'), {
            workerType: 'thread',
            workerTerminateTimeout: 10000
        });

        if (JobModel) {
            this.jobsRepository = new JobsRepository({JobModel});
        }
    }

    /**
     * @method init
     * @async
     * @description Initializes the job manager, starts reporting stats, and optionally starts the queue filler.
     * @returns {Promise<void>}
     */
    async init() {
        console.log(`[JobManager] Initializing`);

        this.reportStats();

        if (this.#testMode) {
            // this.testDataContinuousFill();
            this.startQueueFiller();
        }
    }

    /**
     * @method testDataContinuousFill
     * @description Continuously adds test jobs to the queue for testing purposes.
     * @private
     */
    testDataContinuousFill() {
        setInterval(() => {
            console.log(`[JobManager] Adding 50 test entries`);
            for (let i = 0; i < 50; i++) {
                this.addJob(`test-entry-${Date.now()}-${i}`, {job: 'testEntryJob', data: {a: 1, b: 2}});
            }
        }, 5000);
    }

    /**
     * @method startQueueFiller
     * @async
     * @description Starts the queue filler process.
     * 
     * This method initializes a polling mechanism to continuously check for and process queued jobs.
     * It dynamically adjusts the polling interval based on job availability and system load.
     * 
     * Key features:
     * - Maintains a minimum of 500 pending tasks in the worker pool
     * - Dynamically adjusts polling interval between 1 second and 1 minute
     * - Uses an in-memory set to prevent duplicate job processing
     * - Handles job execution and cleanup
     * 
     * @returns {Promise<void>}
     */
    async startQueueFiller() {
        const MIN_POLL_INTERVAL = 1000; // 1 second
        const MAX_POLL_INTERVAL = 60000; // 1 minute
        const INCREASE_INTERVAL_THRESHOLD = 30000; // 30 seconds
        let currentPollInterval = MIN_POLL_INTERVAL;
        let lastFoundJobTime = Date.now();
        let isPolling = false;
        const queuedJobs = new Set(); // In-memory set to track queued jobs

        const poll = async () => {
            if (isPolling) {
                return;
            }

            isPolling = true;
            console.log(`[JobManager] Polling for jobs, current interval: ${Math.floor(currentPollInterval / 1000)}s`);
            try {
                const stats = await this.getStats();
                if (stats.pendingTasks <= 500) {
                    const entriesToAdd = Math.min(500, 501 - stats.pendingTasks);
                    console.log(`[JobManager] Adding ${entriesToAdd} queue entries. Current pending tasks: ${stats.pendingTasks}`);
                    const jobs = await this.jobsRepository.getQueuedJobs(entriesToAdd);

                    if (jobs.length > 0) {
                        lastFoundJobTime = Date.now();
                        currentPollInterval = MIN_POLL_INTERVAL;
                    } else {
                        const timeSinceLastJob = Date.now() - lastFoundJobTime;
                        if (timeSinceLastJob > INCREASE_INTERVAL_THRESHOLD) {
                            currentPollInterval = MAX_POLL_INTERVAL;
                        }
                    }

                    jobs.forEach((job) => {
                        const jobName = job.get('name');
                        if (queuedJobs.has(jobName)) {
                            return;
                        }
                        const jobMetadata = JSON.parse(job.get('metadata'));
                        const jobData = jobMetadata.data;
                        const jobPath = jobMetadata.job;

                        queuedJobs.add(jobName);

                        this.pool.exec('executeJob', [jobPath, jobData])
                            .then(async () => {
                                await this.jobsRepository.delete(job.id);
                                queuedJobs.delete(jobName); // clear memory entry last
                            })
                            .catch(async (error) => {
                                queuedJobs.delete(jobName);
                                await this.jobsRepository.update(job.id, {
                                    status: 'error',
                                    finished_at: new Date(),
                                    metadata: {
                                        error: error.message,
                                        retries: jobMetadata.retries + 1,
                                        ...jobMetadata
                                    }
                                });
                            });
                    });
                }
            } catch (error) {
                console.error('[JobManager] Error in queue filler:', error);
            } finally {
                isPolling = false;
                this.queueFillerTimeout = setTimeout(poll, currentPollInterval);
            }
        };

        poll(); // Initial poll
    }

    /**
     * @method addJob
     * @async
     * @description Adds a new job to the job repository.
     * @param {string} job - The name or identifier of the job.
     * @param {Object} metadata - Metadata associated with the job.
     * @returns {Promise<Object>} The added job model.
     */
    async addJob(job, metadata) {
        const model = await this.jobsRepository.addQueuedJob(job, metadata);
        return model;
    }

    /**
     * @method getStats
     * @async
     * @description Retrieves the current stats of the worker pool.
     * @returns {Promise<Object>} The worker pool stats.
     */
    async getStats() {
        return this.pool.stats();
    }

    /**
     * @method reportStats
     * @async
     * @description Starts periodic reporting of JobManagerBackground stats.
     */
    async reportStats() {
        setInterval(() => {
            console.log(`[JobManager] -- JobManagerBackground stats --`);
            console.log(this.pool.stats());
        }, 10000);
    }
}

module.exports = JobManagerBackground;