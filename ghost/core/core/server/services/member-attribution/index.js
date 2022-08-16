const urlService = require('../url');

class MemberAttributionServiceWrapper {
    init() {
        if (this.service) {
            // Prevent creating duplicate DomainEvents subscribers
            return;
        }

        const MemberAttributionService = require('@tryghost/member-attribution');
        const models = require('../../models');

        // For now we don't need to expose anything (yet)
        this.service = new MemberAttributionService({
            MemberCreatedEvent: models.MemberCreatedEvent,
            SubscriptionCreatedEvent: models.SubscriptionCreatedEvent,
            urlService
        });
    }
}

module.exports = new MemberAttributionServiceWrapper();
