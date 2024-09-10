const JobsRepository = require('./JobsRepository'); // use this for persistence

class JobManagerBackground {
    #testMode = true;
    
    /**
     * @param {Object} options
     * @param {Object} [options.JobModel] - a model which can persist job data in the storage
    */
    constructor({JobModel}) {
        const workerpool = require('workerpool'); // don't use fastq because it runs on the main thread
        this.pool = workerpool.pool(__dirname + '/jobs/test-job.js', {
            workerType: 'thread',
            workerTerminateTimeout: 10000,
            maxWorkers: 3
        });

        if (JobModel) {
            this.jobsRepository = new JobsRepository({JobModel});
        }
    }

    async init() {
        console.log(`JobManagerBackground initializing`);

        // console.log(`JobModel`, this.jobsRepository);
        this.reportStats();

        if (this.#testMode) {
            // this.testDataContinuousFill();
            this.startQueueFiller();
        }
    }

    testDataContinuousFill() {
        setInterval(() => {
            console.log(`--adding 50 test entries--`);
            for (let i = 0; i < 50; i++) {
                this.addJob(`test-entry-${Date.now()}-${i}`, {job: 'testEntryJob', data: {a: 1, b: 2}});
            }
        }, 5000);
    }

    async startQueueFiller() {
        const POLL_INTERVAL = 5000; // 5 seconds
        let isPolling = false;
        const queuedJobs = new Set(); // In-memory set to track queued jobs

        const poll = async () => {
            if (isPolling) {
                return;
            }
            console.log(`--queue filler polling--`);

            isPolling = true;
            try {
                const stats = await this.getStats();
                if (stats.pendingTasks <= 50) {
                    const entriesToAdd = Math.min(50, 51 - stats.pendingTasks);
                    console.log(`--adding ${entriesToAdd} entries to queue--`);
                
                    // get entries from repository
                    const jobs = await this.jobsRepository.getQueuedJobs();
                    jobs.forEach((job) => {
                        const jobName = job.get('name');
                        if (queuedJobs.has(jobName)) {
                            console.log(`--skipping already queued job: ${jobName}--`);
                            return;
                        }
                        console.log(`--adding job to queue--`, jobName);
                        const jobMetadata = JSON.parse(job.get('metadata'));
                        const jobData = jobMetadata.data;
                        const jobPath = jobMetadata.job;

                        queuedJobs.add(jobName);

                        // Queue the job directly without manipulating jobsRepository
                        this.pool.exec(jobPath, [jobData])
                            .then(async (result) => {
                                console.log(`Job ${jobName} completed with result: ${result}`);
                                queuedJobs.delete(jobName);
                                // TODO: We may want to update scheduled jobs, tbd
                                const jobFromTable = await this.jobsRepository.read(jobName);
                                console.log(`--jobFromTable--`, jobFromTable?.get('name'), jobName);
                                await this.jobsRepository.delete(job.id);
                            })
                            .catch(async (error) => {
                                console.error(`Job ${jobName} failed:`, error);
                                queuedJobs.delete(jobName);
                                // TODO: We may want to do something regarding errors or retries
                                //  retries could be stored in metadata
                                await this.jobsRepository.update(job.id, {
                                    status: 'error',
                                    finished_at: new Date(),
                                    metadata: {
                                        error: error,
                                        retries: jobMetadata.retries + 1,
                                        ...jobMetadata
                                    }
                                });
                            });
                    });
                } else {
                    console.log(`--queue full, skipping this poll cycle--`);
                }
            } catch (error) {
                console.error('Error in queue filler:', error);
            } finally {
                isPolling = false;
            }
        };

        // Start the polling process
        this.queueFillerInterval = setInterval(poll, POLL_INTERVAL);

        // Initial poll
        poll();
    }

    // TODO: could allow for queued entries or just offloaded (immediate) jobs
    async addJob(job, metadata) {
        // this should add a job to the jobsRepository 
        //  and maybe the queue? or we let that get polled
        const model = await this.jobsRepository.addQueuedJob(job, metadata);
        return model;
    }

    async getStats() {
        return this.pool.stats();
    }

    async reportStats() {
        setInterval(() => {
            console.log(`-- JobManagerBackground stats --`);
            console.log(this.pool.stats());
        }, 5000);
    }
}

module.exports = JobManagerBackground;