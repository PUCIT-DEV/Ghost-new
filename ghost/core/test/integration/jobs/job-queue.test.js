const assert = require('assert/strict');
const path = require('path');
const configUtils = require('../../utils/configUtils');
const dbUtils = require('../../utils/db-utils');
const models = require('../../../core/server/models');

// Helper function to wait for job completion
async function waitForJobCompletion(jobName, maxWaitTimeMs = 5000, checkIntervalMs = 50) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitTimeMs) {
        const job = await models.Job.findOne({name: jobName});
        if (!job) {
            return; // Job completed and was removed from the queue
        }
        await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }
    throw new Error(`Job ${jobName} did not complete within ${maxWaitTimeMs}ms`);
}

describe('Job Queue', function () {
    let jobService;

    describe('enabled by config', function () {
        beforeEach(async function () {
            models.init();
            await configUtils.set('services:jobs:queue:enabled', true);
            jobService = require('../../../core/server/services/jobs/job-service');
        });

        afterEach(async function () {
            await configUtils.restore();
            await dbUtils.teardown();
        });

        it('should add and execute a job in the queue', async function () {
            const job = {
                name: `add-random-numbers-${Date.now()}`,
                metadata: {
                    job: path.resolve(__dirname, './test-job.js'),
                    data: {}
                }
            };

            // Add the job to the queue
            const result = await jobService.addQueuedJob(job);
            assert.ok(result);

            // Wait for the job to complete
            await waitForJobCompletion(job.name);

            // Verify that the job no longer exists in the queue
            const jobEntry = await models.Job.findOne({name: job.name});
            assert.equal(jobEntry, null);
        });
    });

    describe('not enabled', function () {
        beforeEach(async function () {
            models.init();
            jobService = require('../../../core/server/services/jobs/job-service');
        });

        afterEach(async function () {
            await dbUtils.teardown();
        });

        it('should not add a job to the queue when disabled', async function () {
            const job = {
                name: `add-random-numbers-${Date.now()}`,
                metadata: {
                    job: path.resolve(__dirname, './test-job.js'),
                    data: {}
                }
            };

            // Attempt to add the job to the queue
            const result = await jobService.addQueuedJob(job);
            assert.equal(result, undefined);

            // Verify that the job doesn't exist in the queue
            const jobEntry = await models.Job.findOne({name: job.name});
            assert.equal(jobEntry, null);
        });
    });
});