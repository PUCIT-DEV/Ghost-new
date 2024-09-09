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
            workerTerminateTimeout: 10000
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
            // console.log(`--test mode--`);
            // const jobs = await this.jobsRepository.getQueuedJobs();
            // jobs.forEach((job) => {
                // console.log(`--job--`, job.get('name'));
            // });
            // console.log(`--jobs--`, jobs);
            this.startTestLoop();
            // this.startPoller();
            // this.startPoller();
            // this.startPoller();
            this.startQueueFiller();
        }
    }

    startTestLoop() {
        setInterval(() => {
            console.log(`--adding 50 test entries--`);
            for (let i = 0; i < 50; i++) {
                this.addJob(`test-entry-${Date.now()}-${i}`, {job: 'testEntryJob', data: {a: 1, b: 2}});
            }
        }, 5000);
    }

    // create a poller that will pick up jobs from the repo and push them to the worker pool
    // the worker pool will then process the job and update the job status in the repo
    // the poller will then mark the job as done in the repo
    // the poller will then repeat
    // NOTE: This is single-threaded so it will not populate more than one worker, ie it won't fill up a queue.
    async startPoller() {
        const POLL_INTERVAL = 5000; // 5 seconds
        let isPolling = false;

        const poll = async () => {
            if (isPolling) {
                return;
            }

            isPolling = true;
            try {
                const queuedJob = await this.jobsRepository.getNextQueuedJob();
                if (queuedJob) {
                    const name = queuedJob.get('name');
                    console.log(`--attempting to process job: ${name}`);
                    const metadata = JSON.parse(queuedJob.get('metadata'));

                    // Update job status to started
                    await this.jobsRepository.update(queuedJob.id, {
                        status: 'started',
                        started_at: new Date()
                    });

                    // Process the job in the worker pool
                    try {
                        const {job, data} = metadata;
                        console.log(`--processing job-- ${job} with metadata ${metadata}`);
                        await this.pool.exec(job, [data.a, data.b]);
                        console.log(`--job completed successfully--`);

                        // Job completed successfully
                        await this.jobsRepository.delete(queuedJob.id);
                    } catch (error) {
                        console.error(`--job failed: `, error);
                        // Job failed
                        await this.jobsRepository.update(queuedJob.id, {
                            status: 'failed',
                            finished_at: new Date(),
                            error: error.message
                        });
                    }

                    // Immediately check for next job
                    setImmediate(poll);
                }
            } catch (error) {
                console.error('Error in job poller:', error);
            } finally {
                isPolling = false;
            }
        };

        // Start the polling process
        this.pollerInterval = setInterval(poll, POLL_INTERVAL);

        // Initial poll
        poll();
    }

    async startQueueFiller() {
        console.log(`--queue filler starting--`);
        const POLL_INTERVAL = 1000; // 1 second
        let isPolling = false;

        const poll = async () => {
            if (isPolling) {
                return;
            }
            console.log(`--queue filler polling--`);

            isPolling = true;
            try {
                const stats = await this.getStats();
                if (stats.pendingTasks <= 100) {
                    const entriesToAdd = Math.min(50, 101 - stats.pendingTasks);
                    console.log(`--adding ${entriesToAdd} entries to queue--`);
                
                    // get entries from repository
                    const jobs = await this.jobsRepository.getQueuedJobs();
                    // console.log(`--jobs--`, jobs);
                    jobs.forEach((job) => {
                        const jobName = job.get('name');
                        // console.log(`--job--`, jobName);
                        const jobMetadata = JSON.parse(job.get('metadata'));
                        // console.log(`--jobMetadata--`, jobMetadata);
                        const jobData = jobMetadata.data;
                        const jobPath = jobMetadata.job;

                        // Queue the job directly without manipulating jobsRepository
                        this.pool.exec(jobPath, [jobData])
                            .then((result) => {
                                console.log(`Job ${jobName} completed with result: ${result}`);
                                // Here, the job worker would update the jobsRepository
                            })
                            .catch((error) => {
                                console.error(`Job ${jobName} failed:`, error);
                                // Here, the job worker would update the jobsRepository
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