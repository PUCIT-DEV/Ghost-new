const {MilestoneCreatedEvent} = require('@tryghost/milestones');

/**
 * @typedef {import('@tryghost/logging')} logging
 */

/**
 * @typedef {import('analytics-node')} analytics
 */

/**
 * @typedef {import('../../../shared/sentry')} sentry
 */

/**
 * @typedef {import('@tryghost/domain-events')} DomainEvents
 */

/**
 * @typedef {object} IDomainEventsAnalytics
 * @param {analytics} analytics
 * @param {logging} logging
 * @param {object} trackDefaults
 * @param {string} prefix
 * @param {sentry} sentry
 * @param {DomainEvents} DomainEvents
 * @prop {} subscribeToEvents
 */

module.exports = class DomainEventsAnalytics {
    /** @type {analytics} */
    #analytics;
    /** @type {object} */
    #trackDefaults;
    /** @type {string} */
    #prefix;
    /** @type {sentry} */
    #sentry;
    /** @type {logging} */
    #logging;
    /** @type {DomainEvents} */
    #DomainEvents;

    constructor(deps) {
        this.#analytics = deps.analytics;
        this.#trackDefaults = deps.trackDefaults;
        this.#prefix = deps.prefix;
        this.#sentry = deps.sentry;
        this.#logging = deps.logging;
        this.#DomainEvents = deps.DomainEvents;
    }

    /**
     *
     * @param {object} event
     * @param {object} event.data
     * @param {object} event.data.milestone
     * @param {number} event.data.milestone.value
     * @param {string} event.data.milestone.type
     * @returns {Promise<void>}
     */
    async #handleMilestoneCreatedEvent(event) {
        if (event.data.milestone
            && event.data.milestone.value === 100
        ) {
            const eventName = event.data.milestone.type === 'arr' ? '$100 MRR reached' : '100 members reached';

            try {
                this.#analytics.track(Object.assign(this.#trackDefaults, {}, {event: this.#prefix + eventName}));
            } catch (err) {
                this.#logging.error(err);
                this.#sentry.captureException(err);
            }
        }
    }

    subscribeToEvents() {
        this.#DomainEvents.subscribe(MilestoneCreatedEvent, async (event) => {
            await this.#handleMilestoneCreatedEvent(event);
        });
    }
};
