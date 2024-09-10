/**
 * @class JobsRepository
 * @description Repository class for managing job-related operations.
 */
class JobsRepository {
    /**
     * @constructor
     * @param {Object} options - The options object.
     * @param {Object} options.JobModel - The Job model for database operations.
     */
    constructor({JobModel}) {
        this._JobModel = JobModel;
    }

    /**
     * @method add
     * @async
     * @description Adds a new job to the database.
     * @param {Object} data - The job data to be added.
     * @returns {Promise<Object>} The added job object.
     */
    async add(data) {
        const job = await this._JobModel.add(data);
        return job;
    }

    /**
     * @method read
     * @async
     * @description Reads a job from the database by name.
     * @param {string} name - The name of the job to read.
     * @returns {Promise<Object|null>} The job object if found, null otherwise.
     */
    async read(name) {
        const job = await this._JobModel.findOne({name});
        return job;
    }

    /**
     * @method update
     * @async
     * @description Updates a job in the database.
     * @param {string} id - The ID of the job to update.
     * @param {Object} data - The updated job data.
     * @returns {Promise<void>}
     */
    async update(id, data) {
        await this._JobModel.edit(data, {id});
    }

    /**
     * @method getNextQueuedJob
     * @async
     * @description Retrieves the next queued job from the database.
     * @returns {Promise<Object|null>} The next queued job object if found, null otherwise.
     */
    async getNextQueuedJob() {
        const job = await this._JobModel.findOne({
            queue_entry: 1
        });
        return job;
    }

    /**
     * @method getQueuedJobs
     * @async
     * @description Retrieves a list of queued jobs from the database.
     * @param {number} [limit=50] - The maximum number of jobs to retrieve.
     * @returns {Promise<Array>} An array of queued job objects.
     */
    async getQueuedJobs(limit = 50) {
        const jobs = await this._JobModel.findPage({
            filter: 'queue_entry:1',
            limit
        });
        return jobs.data;
    }

    /**
     * @method addQueuedJob
     * @async
     * @description Adds a new queued job to the database.
     * @param {string} name - The name of the job.
     * @param {Object} metadata - The metadata associated with the job.
     * @returns {Promise<Object>} The added job object.
     */
    async addQueuedJob(name, metadata) {
        const job = await this._JobModel.add({
            name: name,
            status: 'queued',
            metadata: metadata,
            queue_entry: 1
        });
        return job;
    }

    /**
     * @method delete
     * @async
     * @description Deletes a job from the database.
     * @param {string} id - The ID of the job to delete.
     * @returns {Promise<void>}
     */
    async delete(id) {
        try {
            await this._JobModel.destroy({id});
        } catch (error) {
            console.error(`Error deleting job ${id}:`, error);
        }
    }
}

module.exports = JobsRepository;
