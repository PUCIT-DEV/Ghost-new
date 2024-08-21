const EventProcessingResult = require('./EventProcessingResult');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

/**
 * @typedef {import('@tryghost/email-service').EmailEventProcessor} EmailEventProcessor
 */

/**
 * @typedef {object} FetchData
 * @property {boolean} running
 * @property {('email-analytics-latest-others'|'email-analytics-missing'|'email-analytics-latest-opened'|'email-analytics-scheduled')} jobName Name of the job that is running
 * @property {Date} [lastStarted] Date the last fetch started on
 * @property {Date} [lastBegin] The begin time used during the last fetch
 * @property {Date} [lastEventTimestamp]
 * @property {boolean} [canceled] Set to quit the job early
 */

/**
 * @typedef {FetchData & {schedule?: {begin: Date, end: Date}}} FetchDataScheduled
 */

/**
 * @typedef {'delivered' | 'opened' | 'failed' | 'unsubscribed' | 'complained'} EmailAnalyticsEvent
 */

const TRUST_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const FETCH_LATEST_END_MARGIN_MS = 1 * 60 * 1000; // Do not fetch events newer than 1 minute (yet). Reduces the chance of having missed events in fetchLatest.

module.exports = class EmailAnalyticsService {
    config;
    settings;
    queries;
    eventProcessor;
    providers;

    /**
     * @type {FetchData}
     */
    #fetchLatestNonOpenedData = {
        running: false,
        jobName: 'email-analytics-latest-others'
    };

    /**
     * @type {FetchData}
     */
    #fetchMissingData = {
        running: false,
        jobName: 'email-analytics-missing'
    };

    /**
     * @type {FetchData}
     */
    #fetchLatestOpenedData = {
        running: false,
        jobName: 'email-analytics-latest-opened'
    };

    /**
     * @type {FetchDataScheduled}
     */
    #fetchScheduledData = {
        running: false,
        jobName: 'email-analytics-scheduled'
    };

    /**
     * @param {object} dependencies
     * @param {object} dependencies.config
     * @param {object} dependencies.settings
     * @param {object} dependencies.queries
     * @param {EmailEventProcessor} dependencies.eventProcessor
     * @param {object} dependencies.providers
     */
    constructor({config, settings, queries, eventProcessor, providers}) {
        this.config = config;
        this.settings = settings;
        this.queries = queries;
        this.eventProcessor = eventProcessor;
        this.providers = providers;
    }


    getStatus() {
        return {
            latest: this.#fetchLatestNonOpenedData,
            missing: this.#fetchMissingData,
            scheduled: this.#fetchScheduledData,
            latestOpened: this.#fetchLatestOpenedData
        };
    }

    /**
     * Returns the timestamp of the last non-opened event we processed. Defaults to now minus 30 minutes if we have no data yet.
     */
    async getLastNonOpenedEventTimestamp() {
        return this.#fetchLatestNonOpenedData?.lastEventTimestamp ?? (await this.queries.getLastEventTimestamp(this.#fetchLatestNonOpenedData.jobName,['delivered','failed'])) ?? new Date(Date.now() - TRUST_THRESHOLD_MS);
    }

    /**
     * Returns the timestamp of the last opened event we processed. Defaults to now minus 30 minutes if we have no data yet.
     */
    async getLastOpenedEventTimestamp() {
        return this.#fetchLatestOpenedData?.lastEventTimestamp ?? (await this.queries.getLastEventTimestamp(this.#fetchLatestOpenedData.jobName,['opened'])) ?? new Date(Date.now() - TRUST_THRESHOLD_MS);
    }

    /**
     * Fetches the latest opened events.
     * @param {Object} options - The options for fetching events.
     * @param {number} [options.maxEvents=Infinity] - The maximum number of events to fetch.
     * @returns {Promise<number>} The total number of events fetched.
     */
    async fetchLatestOpenedEvents({maxEvents = Infinity} = {}) {
        // Start where we left of, or the last stored event in the database, or start 30 minutes ago if we have nothing available
        const begin = await this.getLastOpenedEventTimestamp();
        const end = new Date(Date.now() - FETCH_LATEST_END_MARGIN_MS); // Always stop at x minutes ago to give Mailgun a bit more time to stabilize storage

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Skipping fetchLatestOpenedEvents because end (' + end + ') is before begin (' + begin + ')');
            return 0;
        }

        return await this.#fetchEvents(this.#fetchLatestOpenedData, {begin, end, maxEvents, eventTypes: ['opened']});
    }

    /**
     * Fetches the latest non-opened events.
     * @param {Object} options - The options for fetching events.
     * @param {number} [options.maxEvents=Infinity] - The maximum number of events to fetch.
     * @returns {Promise<number>} The total number of events fetched.
     */
    async fetchLatestNonOpenedEvents({maxEvents = Infinity} = {}) {
        // Start where we left of, or the last stored event in the database, or start 30 minutes ago if we have nothing available
        const begin = await this.getLastNonOpenedEventTimestamp();
        const end = new Date(Date.now() - FETCH_LATEST_END_MARGIN_MS); // Always stop at x minutes ago to give Mailgun a bit more time to stabilize storage

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Skipping fetchLatestNonOpenedEvents because end (' + end + ') is before begin (' + begin + ')');
            return 0;
        }

        return await this.#fetchEvents(this.#fetchLatestNonOpenedData, {begin, end, maxEvents, eventTypes: ['delivered', 'failed', 'unsubscribed', 'complained']});
    }

    /**
     * Fetches events that are older than 30 minutes, because then the 'storage' of the Mailgun API is stable. And we are sure we don't miss any events.
     * @param {object} options
     * @param {number} [options.maxEvents] Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     */
    async fetchMissing({maxEvents = Infinity} = {}) {
        // We start where we left of, or 1,5h ago after a server restart
        const begin = this.#fetchMissingData?.lastEventTimestamp ?? this.#fetchMissingData?.lastBegin ?? new Date(Date.now() - TRUST_THRESHOLD_MS * 3);

        // Always stop at the earlier of the time the fetchLatest started fetching on or 30 minutes ago
        const end = new Date(
            Math.min(
                Date.now() - TRUST_THRESHOLD_MS,
                this.#fetchLatestNonOpenedData?.lastBegin?.getTime()
            )
        );

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Skipping fetchMissing because end (' + end + ') is before begin (' + begin + ')');
            return 0;
        }

        return await this.#fetchEvents(this.#fetchMissingData, {begin, end, maxEvents});
    }

    /**
     * Schedule a new fetch for email analytics events.
     * @param {Object} options - The options for scheduling the fetch.
     * @param {Date} options.begin - The start date for the scheduled fetch.
     * @param {Date} options.end - The end date for the scheduled fetch.
     * @throws {errors.ValidationError} Throws an error if a fetch is already in progress.
     */
    schedule({begin, end}) {
        if (this.#fetchScheduledData && this.#fetchScheduledData.running) {
            throw new errors.ValidationError({
                message: 'Already fetching scheduled events. Wait for it to finish before scheduling a new one.'
            });
        }
        logging.info('[EmailAnalytics] Scheduling fetch from ' + begin.toISOString() + ' until ' + end.toISOString());
        this.#fetchScheduledData = {
            running: false,
            jobName: 'email-analytics-scheduled',
            schedule: {
                begin,
                end
            }
        };
    }

    /**
     * Cancels the scheduled fetch of email analytics events.
     * If a fetch is currently running, it marks it for cancellation.
     * If no fetch is running, it clears the scheduled fetch data.
     * @method cancelScheduled
     */
    cancelScheduled() {
        if (this.#fetchScheduledData) {
            if (this.#fetchScheduledData.running) {
                // Cancel the running fetch
                this.#fetchScheduledData.canceled = true;
            } else {
                this.#fetchScheduledData = null;
            }
        }
    }

    /**
     * Continues fetching the scheduled events (does not start one). Resets the scheduled event when received 0 events.
     * @method fetchScheduled
     * @param {Object} [options] - The options for fetching scheduled events.
     * @param {number} [options.maxEvents=Infinity] - The maximum number of events to fetch.
     * @returns {Promise<number>} The number of events fetched.
     */
    async fetchScheduled({maxEvents = Infinity} = {}) {
        if (!this.#fetchScheduledData || !this.#fetchScheduledData.schedule) {
            // Nothing scheduled
            return 0;
        }

        if (this.#fetchScheduledData.canceled) {
            // Skip for now
            this.#fetchScheduledData = null;
            return 0;
        }

        let begin = this.#fetchScheduledData.schedule.begin;
        const end = this.#fetchScheduledData.schedule.end;

        if (this.#fetchScheduledData.lastEventTimestamp && this.#fetchScheduledData.lastEventTimestamp > begin) {
            // Continue where we left of
            begin = this.#fetchScheduledData.lastEventTimestamp;
        }

        if (end <= begin) {
            // Skip for now
            logging.info('[EmailAnalytics] Ending fetchScheduled because end is before begin');
            this.#fetchScheduledData = null;
            return 0;
        }

        const count = await this.#fetchEvents(this.#fetchScheduledData, {begin, end, maxEvents});
        if (count === 0 || this.#fetchScheduledData.canceled) {
            // Reset the scheduled fetch
            this.#fetchScheduledData = null;
        }

        this.queries.setJobTimestamp(this.#fetchScheduledData.jobName, 'completed', this.#fetchScheduledData.lastEventTimestamp);
        return count;
    }
    /**
     * Start fetching analytics and store the data of the progress inside fetchData
     * @param {FetchData} fetchData - Object to store the progress of the fetch operation
     * @param {object} options - Options for fetching events
     * @param {Date} options.begin - Start date for fetching events
     * @param {Date} options.end - End date for fetching events
     * @param {number} [options.maxEvents=Infinity] - Maximum number of events to fetch. Not a strict maximum. We stop fetching after we reached the maximum AND received at least one event after begin (not equal) to prevent deadlocks.
     * @param {EmailAnalyticsEvent[]} [options.eventTypes] - Array of event types to fetch. If not provided, Mailgun will return all event types.
     * @returns {Promise<number>} The number of events fetched
     */
    async #fetchEvents(fetchData, {begin, end, maxEvents = Infinity, eventTypes = null}) {
        // Start where we left of, or the last stored event in the database, or start 30 minutes ago if we have nothing available
        logging.info('[EmailAnalytics] Fetching from ' + begin.toISOString() + ' until ' + end.toISOString() + ' (maxEvents: ' + maxEvents + ')');

        // Store that we started fetching
        fetchData.running = true;
        fetchData.lastStarted = new Date();
        fetchData.lastBegin = begin;
        this.queries.setJobTimestamp(fetchData.jobName, 'started', begin);

        let lastAggregation = Date.now();
        let eventCount = 0;

        // We keep the processing result here, so we also have a result in case of failures
        let processingResult = new EventProcessingResult();
        let error = null;

        const processBatch = async (events) => {
            // Even if the fetching is interrupted because of an error, we still store the last event timestamp
            await this.processEventBatch(events, processingResult, fetchData);
            eventCount += events.length;

            // Every 5 minutes or 5000 members we do an aggregation and clear the processingResult
            // Otherwise we need to loop a lot of members afterwards, and this takes too long without updating the stat counts in between
            if (Date.now() - lastAggregation > 5 * 60 * 1000 || processingResult.memberIds.length > 5000) {
                // Aggregate and clear the processingResult
                // We do this here because otherwise it could take a long time before the new events are visible in the stats
                try {
                    await this.aggregateStats(processingResult);
                    lastAggregation = Date.now();
                    processingResult = new EventProcessingResult();
                } catch (err) {
                    logging.error('[EmailAnalytics] Error while aggregating stats');
                    logging.error(err);
                }
            }

            if (fetchData.canceled) {
                throw new errors.InternalServerError({
                    message: 'Fetching canceled'
                });
            }
        };

        try {
            for (const provider of this.providers) {
                await provider.fetchLatest(processBatch, {begin, end, maxEvents, events: eventTypes});
            }

            logging.info('[EmailAnalytics] Fetching finished');
        } catch (err) {
            if (err.message !== 'Fetching canceled') {
                logging.error('[EmailAnalytics] Error while fetching');
                logging.error(err);
                error = err;
            } else {
                logging.error('[EmailAnalytics] Canceled fetching');
            }
        }

        // Aggregate
        try {
            await this.aggregateStats(processingResult);
        } catch (err) {
            logging.error('[EmailAnalytics] Error while aggregating stats');
            logging.error(err);

            if (!error) {
                error = err;
            }
        }

        // Small trick: if reached the end of new events, we are going to keep
        // fetching the same events because 'begin' won't change
        // So if we didn't have errors while fetching, and total events < maxEvents, increase lastEventTimestamp with one second
        if (!error && eventCount > 0 && eventCount < maxEvents && fetchData.lastEventTimestamp && fetchData.lastEventTimestamp.getTime() < Date.now() - 2000) {
            logging.info('[EmailAnalytics] Reached end of new events, increasing lastEventTimestamp with one second');
            // set the data on the db so we can store it for fetching after reboot
            await this.queries.setJobTimestamp(fetchData.jobName, 'completed', new Date(fetchData.lastEventTimestamp.getTime()));
            // increment and store in local memory
            fetchData.lastEventTimestamp = new Date(fetchData.lastEventTimestamp.getTime() + 1000);
        }

        fetchData.running = false;

        if (error) {
            throw error;
        }
        return eventCount;
    }

    /**
     * Process a batch of email analytics events.
     * @param {any[]} events - An array of email analytics events to process.
     * @param {Object} result - The result object to merge batch processing results into.
     * @param {FetchData} fetchData - Data related to the current fetch operation.
     * @returns {Promise<void>}
     */
    async processEventBatch(events, result, fetchData) {
        const processStart = Date.now();
        for (const event of events) {
            const batchResult = await this.processEvent(event);

            // Save last event timestamp
            if (!fetchData.lastEventTimestamp || (event.timestamp && event.timestamp > fetchData.lastEventTimestamp)) {
                fetchData.lastEventTimestamp = event.timestamp;
            }

            result.merge(batchResult);
        }
        const processEnd = Date.now();
        const time = processEnd - processStart;
        if (time > 1000) {
            // This is a means to show in the logs that the analytics job is still alive.
            logging.warn(`[EmailAnalytics] Processing event batch took ${(time / 1000).toFixed(1)}s`);
        }
    }

    /**
     *
     * @param {{id: string, type: any; severity: any; recipientEmail: any; emailId?: string; providerId: string; timestamp: Date; error: {code: number; message: string; enhandedCode: string|number} | null}} event
     * @returns {Promise<EventProcessingResult>}
     */
    async processEvent(event) {
        if (event.type === 'delivered') {
            const recipient = await this.eventProcessor.handleDelivered({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp);

            if (recipient) {
                return new EventProcessingResult({
                    delivered: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        if (event.type === 'opened') {
            const recipient = await this.eventProcessor.handleOpened({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp);

            if (recipient) {
                return new EventProcessingResult({
                    opened: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        if (event.type === 'failed') {
            if (event.severity === 'permanent') {
                const recipient = await this.eventProcessor.handlePermanentFailed({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, {id: event.id, timestamp: event.timestamp, error: event.error});

                if (recipient) {
                    return new EventProcessingResult({
                        permanentFailed: 1,
                        emailIds: [recipient.emailId],
                        memberIds: [recipient.memberId]
                    });
                }

                return new EventProcessingResult({unprocessable: 1});
            } else {
                const recipient = await this.eventProcessor.handleTemporaryFailed({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, {id: event.id, timestamp: event.timestamp, error: event.error});

                if (recipient) {
                    return new EventProcessingResult({
                        temporaryFailed: 1,
                        emailIds: [recipient.emailId],
                        memberIds: [recipient.memberId]
                    });
                }

                return new EventProcessingResult({unprocessable: 1});
            }
        }

        if (event.type === 'unsubscribed') {
            const recipient = await this.eventProcessor.handleUnsubscribed({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp);

            if (recipient) {
                return new EventProcessingResult({
                    unsubscribed: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        if (event.type === 'complained') {
            const recipient = await this.eventProcessor.handleComplained({emailId: event.emailId, providerId: event.providerId, email: event.recipientEmail}, event.timestamp);

            if (recipient) {
                return new EventProcessingResult({
                    complained: 1,
                    emailIds: [recipient.emailId],
                    memberIds: [recipient.memberId]
                });
            }

            return new EventProcessingResult({unprocessable: 1});
        }

        return new EventProcessingResult({unhandled: 1});
    }

    /**
     * @param {{emailIds?: string[], memberIds?: string[]}} stats
     */
    async aggregateStats({emailIds = [], memberIds = []}) {
        for (const emailId of emailIds) {
            await this.aggregateEmailStats(emailId);
        }

        logging.info(`[EmailAnalytics] Aggregating for ${memberIds.length} members`);
        for (const memberId of memberIds) {
            await this.aggregateMemberStats(memberId);
        }
    }

    /**
     * Aggregate email stats for a given email ID.
     * @param {string} emailId - The ID of the email to aggregate stats for.
     * @returns {Promise<void>}
     */
    async aggregateEmailStats(emailId) {
        return this.queries.aggregateEmailStats(emailId);
    }

    /**
     * Aggregate member stats for a given member ID.
     * @param {string} memberId - The ID of the member to aggregate stats for.
     * @returns {Promise<void>}
     */
    async aggregateMemberStats(memberId) {
        return this.queries.aggregateMemberStats(memberId);
    }
};
