var Mailchimp = require('mailchimp-api-v3'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    moment = require('moment'),
    crypto = require('crypto'),
    config = require('../config'),
    dataProvider = require('../models'),
    apiUtils = require('./utils'),
    logging = require('../logging'),
    errors = require('../errors'),
    i18n = require('../i18n'),
    pipeline = require('../utils/pipeline'),
    settingsCache = require('../settings/cache'),

    mailchimp,
    getMailchimpError;

// NOTE: the error messages from MailChimp are always in English.
getMailchimpError = function getMailchimpError(error) {
    if (error.title === 'API Key Invalid' || (error.message && error.message.indexOf('invalid api key') > -1)) {
        return new errors.ValidationError({
            code: 'MAILCHIMP',
            message: error.title || error.message,
            context: error.detail && error.detail + ' (' + error.type + ')'
        });
    }

    // CASE: If you register a subscriber too often for too many lists, this mail is banned. Mailchimp title is `Invalid Resource`.
    // See https://developer.mailchimp.com/documentation/mailchimp/guides/error-glossary.
    if (error.message && error.message.indexOf('has signed up to a lot of lists very recently') !== -1) {
        return new errors.BadRequestError({
            code: 'MAILCHIMP',
            message: error.title || error.message,
            context: error.detail && error.detail + ' (' + error.type + ')'
        });
    }

    if (error.status === 404) {
        return new errors.NotFoundError({
            code: 'MAILCHIMP',
            message: error.title || error.message,
            statusCode: 404,
            context:  error.detail + ' (' + error.type + ')'
        });
    }

    return new errors.InternalServerError({
        code: 'MAILCHIMP',
        message: error.title || error.message,
        context: error.detail + ' (' + error.type + ')',
        errorDetails: error.errors
    });
};

mailchimp = {
    /**
     * Get information about all mailing lists in MailChimp account
     *
     * @param  {Object} options
     * @return {Promise<List>} List collection
     */
    fetchLists: function fetchLists(options) {
        var tasks;

        /**
         * ### MailChimp API query
         * Make the API query to the lists endpoint
         * @param  {Object} options
         * @return {[type]}         [description]
         */
        function doQuery(options) {
            var apiKey, mailchimp;

            if (options.apiKey !== null && options.apiKey !== undefined) {
                apiKey = options.apiKey;
            } else {
                apiKey = settingsCache.get('mailchimp').apiKey;
            }

            mailchimp = new Mailchimp(apiKey);

            // NOTE: assumes no-one will have more than 500 lists, we return
            // total_items so at least we can debug in a situation where someone
            // is missing lists in the dropdown
            return mailchimp.get('/lists', {
                fields: 'lists.id,lists.name,total_items',
                count: 500
            });
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            // NOTE: Mailchimp has only one endpoint to fetch the lists. No need to add a migration to add permissions for that.
            // We simply use the settings permissions, because mailchimp is a setting.
            apiUtils.handlePermissions('setting', 'read'),
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options)
            .catch(function (err) {
                throw getMailchimpError(err);
            });
    },

    /**
     * Add a single member to your mailchimp list.
     */
    addMember: function addMember(data, options) {
        if (!settingsCache.get('mailchimp').isActive) {
            return Promise.resolve();
        }

        var email = options.email,
            mailchimpConfig = settingsCache.get('mailchimp'),
            mailchimp = new Mailchimp(mailchimpConfig.apiKey),
            emailHash = crypto.createHash('md5').update(email.toLowerCase()).digest('hex');

        return mailchimp.request({
            method: 'put',
            path: '/lists/{list_id}/members/{subscriber_hash}',
            path_params: {
                list_id: mailchimpConfig.activeList.id,
                subscriber_hash: emailHash
            },
            body: {
                email_address: email,
                // NOTE: sends confirmation e-mail if new
                status_if_new: 'pending',
                status: 'pending'
            }
        }).then(function () {
            logging.info('Mailchimp: Added member.', email);
        }).catch(function (err) {
            logging.error(getMailchimpError(err));
            return Promise.resolve();
        }).finally(function () {
            // @TODO: future improvment, store the error message inside the subscriber
            return dataProvider.Subscriber.findOne({email: email}, options)
                .then(function (subscriber) {
                    if (!subscriber) {
                        logging.error(new errors.NotFoundError({
                            message: i18n.t('errors.api.subscribers.subscriberNotFound'),
                            context: email
                        }));

                        return;
                    }

                    subscriber.set('status', 'pending');
                    return subscriber.save(options);
                });
        });
    },

    /**
     * ### Sync Subscribers with Mailchimp list members
     *
     * Other than adding new subscribers, Ghost doesn't have any way of
     * editing subscriber details or changing subscription status so we treat
     * MailChimp as source-of-truth. We pull details from there to update local
     * records and only push new subscribers back to MailChimp.
     *
     * NOTE: we will need to re-visit this when Ghost has more subscription
     * management features.
     *
     * Flow:
     * - fetch all MailChimp list members
     * - update status of subscribers for known e-mail addresses
     * - create subscribers for unknown e-mail addresses
     * - push new subscribers to MailChimp
     * - update sync properties
     *
     * @return {[type]} [description]
     */
    sync: function sync(options) {
        var tasks, mailchimpError;

        if (!settingsCache.get('mailchimp').isActive) {
            return Promise.resolve();
        }

        logging.info('Mailchimp: Start sync.');

        // The options object is passed along the pipeline being updated by each
        // function. Here we set up properties that are needed later.
        function prepareOptions(options) {
            options.settings = settingsCache.get('mailchimp');
            options.mailchimp = new Mailchimp(options.settings.apiKey);
            options.mailchimpErrors = [];
            options.stats = {
                subscribers: {
                    updated: 0,
                    created: 0
                },
                mailchimp: {
                    created: 0,
                    errored: 0
                }
            };

            return options;
        }

        // get all subscribers from the local database - used for comparing
        // against MailChimp list members
        function getSubscribers(options) {
            return dataProvider.Subscriber.findAll(options).then(function (subscribers) {
                options.subscribers = subscribers;
                return options;
            });
        }

        // query all MailChimp list members (assumes no more than 1m members) -
        // used to create new local subscribers and as source-of-truth when
        // updating subscriber statuses
        function getMailchimpListMembers(options) {
            return options.mailchimp.batch({
                method: 'get',
                path: '/lists/{list_id}/members',
                path_params: {
                    list_id: options.settings.activeList.id
                },
                query: {
                    count: 100000000,
                    // NOTE: members.timestamp_signup is always an empty string
                    fields: 'total_items,members.email_address,members.status,,members.timestamp_opt'
                }
            }, {verbose: false}).then(function (result) {
                options.listMembers = result.members;
                return options;
            });
        }

        // use MailChimp member details to update or create local subscribers
        function updateOrCreateSubscribers(options) {
            var updateAndCreatePromises = [];

            // for each member, find a matching subscriber and update.
            _.forEach(options.listMembers, function (member) {
                var subscriber = options.subscribers.findWhere({email: member.email_address});

                // we have a local subscriber for this e-mail address
                if (subscriber) {
                    // only update if the MailChimp status has changed
                    if (subscriber.get('status') !== member.status) {
                        // pending, subscribed, cleaned, unsubscribed
                        subscriber.set('status', member.status);
                        updateAndCreatePromises.push(subscriber.save(options));
                        options.stats.subscribers.updated += 1;
                    }

                    // remove the subscriber from the collection so we can use the
                    // remaining subscribers to create new list members later
                    options.subscribers.remove(subscriber);

                    // no local subscriber for this e-mail, let's create one
                } else {
                    updateAndCreatePromises.push(dataProvider.Subscriber.add({
                        email: member.email_address,
                        status: member.status,
                        created_at: moment(!_.isEmpty(member.timestamp_opt) ? member.timestamp_opt : undefined).toDate(),
                        source: 'app_import'
                    }, _.extend(options, {importing: true})));

                    options.stats.subscribers.created += 1;
                }
            });

            return Promise.all(updateAndCreatePromises).then(function () {
                return options;
            });
        }

        // options.subscribers at this point only includes subscribers that
        // do not exist in the MailChimp list, use these subscribers to create
        // the MailChimp list members
        // NOTE: Adding members is limited to 500 per API request. Do it in batches.
        function createNewMailchimpListMembers(options) {
            var members = [],
                batches = [],
                mailchimpLimitPerRequest = 1,
                generateBatches = function getBatches() {
                    if (!members.length) {
                        return;
                    }

                    var localMembers = members.slice(0, mailchimpLimitPerRequest);
                    members = members.splice(mailchimpLimitPerRequest);

                    batches.push({
                        method: 'post',
                        path: '/lists/{list_id}',
                        path_params: {
                            list_id: options.settings.activeList.id
                        },
                        body: {
                            members: localMembers,
                            update_existing: false
                        }
                    });

                    generateBatches();
                };

            options.subscribers.forEach(function (subscriber) {
                members.push({
                    email_address: subscriber.get('email'),
                    status: subscriber.get('status')
                });
            });

            if (members.length > 0) {
                generateBatches();

                return options.mailchimp.batch(batches, {verbose: false, unpack: true, wait: true, interval: 3 * 1000}).then(function (results) {
                    // `results` is an array with all batch results.
                    _.each(results, function (result) {
                        options.stats.mailchimp.created = options.stats.mailchimp.created + result.total_created;
                        options.stats.mailchimp.errored = options.stats.mailchimp.errored + result.error_count;
                        options.mailchimpErrors = options.mailchimpErrors.concat(result.errors);
                    });

                    if (options.mailchimpErrors && options.mailchimpErrors.length) {
                        logging.error(new errors.ValidationError({
                            code: 'MAILCHIMP',
                            message: 'Mailchimp errors on member creation.',
                            errorDetails: JSON.stringify(options.mailchimpErrors)
                        }));
                    }

                    return options;
                });
            } else {
                return Promise.resolve(options);
            }
        }

        tasks = [
            prepareOptions,
            getSubscribers,
            getMailchimpListMembers,
            updateOrCreateSubscribers,
            createNewMailchimpListMembers
        ];

        return pipeline(tasks, options)
            .then(function returnStats() {
                // NOTE: logging the stats can mess up the logs very much.
                logging.info('Mailchimp: Sync was successful.');

                return {
                    stats: options.stats,
                    errors: options.mailchimpErrors
                };
            })
            .catch(function (err) {
                mailchimpError = getMailchimpError(err);
                logging.error(mailchimpError);

                // The scheduler will retry. Simply update the error message and sync next time.
                // e.g. mailchimp does not exist, api key is wrong (no need to try again)
                // e.g. if mailchimp takes too long, doesn't matter it will continue at mailchimp.
                return Promise.resolve();
            })
            .finally(function () {
                return dataProvider.Settings.findOne({key: 'scheduling'}, options)
                    .then(function (response) {
                        var schedulingConfig = JSON.parse(response.attributes.value);

                        schedulingConfig.subscribers.lastSyncAt = moment().valueOf();
                        schedulingConfig.subscribers.nextSyncAt = moment().add(config.get('times:syncSubscribersInMin') || 1440, 'minutes').valueOf();

                        if (mailchimpError) {
                            schedulingConfig.subscribers.error = mailchimpError.message;
                        } else {
                            schedulingConfig.subscribers.error = '';
                        }

                        if (options.mailchimpErrors && options.mailchimpErrors.length) {
                            schedulingConfig.subscribers.error = JSON.stringify(options.mailchimpErrors);
                        }

                        return dataProvider.Settings.edit([{
                            key: 'scheduling',
                            value: JSON.stringify(schedulingConfig)
                        }], options);
                    });
            });
    }
};

module.exports = mailchimp;
