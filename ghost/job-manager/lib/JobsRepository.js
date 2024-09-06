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

    async delete(id) {
        await this._JobModel.destroy({id});
    }
}

module.exports = JobsRepository;
