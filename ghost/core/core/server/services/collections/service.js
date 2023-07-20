const {
    CollectionsService
} = require('@tryghost/collections');
const BookshelfCollectionsRepository = require('./BookshelfCollectionsRepository');
const labs = require('../../../shared/labs');

class CollectionsServiceWrapper {
    /** @type {CollectionsService} */
    api;

    constructor() {
        const DomainEvents = require('@tryghost/domain-events');
        const postsRepository = require('./PostsRepository').getInstance();
        const models = require('../../models');
        const collectionsRepositoryInMemory = new BookshelfCollectionsRepository(models.Collection);

        const collectionsService = new CollectionsService({
            collectionsRepository: collectionsRepositoryInMemory,
            postsRepository: postsRepository,
            DomainEvents: DomainEvents,
            slugService: {
                async generate(input) {
                    return models.Collection.generateSlug(models.Collection, input, {});
                }
            }
        });

        this.api = collectionsService;
    }

    async init() {
        if (!labs.isSet('collections')) {
            return;
        }

        this.api.subscribeToEvents();
        require('./intercept-events')();
    }
}

module.exports = new CollectionsServiceWrapper();
