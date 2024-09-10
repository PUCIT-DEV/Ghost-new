class JobsRepository {
    constructor({JobModel}) {
        this._JobModel = JobModel;
    }

    async add(data) {
        const job = await this._JobModel.add(data);

        return job;
    }

    async read(name) {
        const job = await this._JobModel.findOne({name});

        return job;
    }

    async update(id, data) {
        await this._JobModel.edit(data, {id});
    }

    async getNextQueuedJob() {
        const job = await this._JobModel.findOne({
            // status: 'queued', // if shutdown is called, we can just re-run the job that is at started or finished and not removed
            queue_entry: 1
        });
        return job;
    }

    async getQueuedJobs(limit = 50) {
        console.log(`attempting to get ${limit} queued jobs`);
        const jobs = await this._JobModel.findPage({
            filter: 'queue_entry:1',
            limit
        });
        // console.log(`--fetched jobs`,jobs.data);
        return jobs.data;
    }

    async addQueuedJob(name, metadata) {
        const job = await this._JobModel.add({
            name: name,
            status: 'queued',
            metadata: metadata,
            queue_entry: 1
        });
        return job;
    }

    async delete(id) {
        console.log(`attempting to delete job ${id}`);
        try {
            await this._JobModel.destroy({id});
        } catch (error) {
            console.error(`Error deleting job ${id}:`, error);
        }
    }
}

module.exports = JobsRepository;
