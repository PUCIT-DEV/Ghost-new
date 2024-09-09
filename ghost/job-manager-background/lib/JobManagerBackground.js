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
            this.testDataContinuousFill();
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