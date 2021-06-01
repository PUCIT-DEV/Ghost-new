const _ = require('lodash');
const url = require('url');
const crypto = require('crypto');
const moment = require('moment');
const Promise = require('bluebird');
const exec = require('child_process').exec;
const errors = require('@tryghost/errors');
const debug = require('ghost-ignition').debug('update-check');

const internal = {context: {internal: true}};

/**
 * Update Checker Class
 *
 * Makes a request to Ghost.org to request release & custom notifications.
 * The service is provided in return for users opting in to anonymous usage data collection.
 *
 * Blog owners can opt-out of update checks by setting `privacy: { useUpdateCheck: false }` in their config file.
 */
class UpdateCheckService {
    constructor({api, config, i18n, logging, urlUtils, request, ghostVersion, ghostMailer}) {
        this.api = api;
        this.config = config;
        this.i18n = i18n;
        this.logging = logging;
        this.urlUtils = urlUtils;
        this.request = request;
        this.ghostVersion = ghostVersion;
        this.ghostMailer = ghostMailer;
    }

    nextCheckTimestamp() {
        const now = Math.round(new Date().getTime() / 1000);
        return now + (24 * 3600);
    }

    /**
     * @description Centralised error handler for the update check unit.
     *
     * CASES:
     *   - the update check service returns an error
     *   - error during collecting blog stats
     *
     * We still need to ensure that we set the "next_update_check" to a new value, otherwise no more
     * update checks will happen.
     *
     * @param err
     */
    updateCheckError(err) {
        this.api.settings.edit({
            settings: [{
                key: 'next_update_check',
                value: this.nextCheckTimestamp()
            }]
        }, internal);

        err.context = this.i18n.t('errors.updateCheck.checkingForUpdatesFailed.error');
        err.help = this.i18n.t('errors.updateCheck.checkingForUpdatesFailed.help', {url: 'https://ghost.org/docs/'});

        this.logging.error(err);
    }

    /**
     * @description Collect stats from your blog.
     * @returns {Promise}
     */
    async updateCheckData() {
        let data = {};
        let mailConfig = this.config.get('mail');

        data.ghost_version = this.ghostVersion.original;
        data.node_version = process.versions.node;
        data.env = this.config.get('env');
        data.database_type = this.config.get('database').client;
        data.email_transport = mailConfig &&
            (mailConfig.options && mailConfig.options.service ?
                mailConfig.options.service :
                mailConfig.transport);

        try {
            const hash = (await this.api.settings.read(_.extend({key: 'db_hash'}, internal))).settings[0];
            const theme = (await this.api.settings.read(_.extend({key: 'active_theme'}, internal))).settings[0];
            const posts = await this.api.posts.browse();
            const users = await this.api.users.browse(internal);
            const npm = await Promise.promisify(exec)('npm -v');

            const blogUrl = this.urlUtils.urlFor('home', true);
            const parsedBlogUrl = url.parse(blogUrl);
            const blogId = parsedBlogUrl.hostname + parsedBlogUrl.pathname.replace(/\//, '') + hash.value;

            data.url = blogUrl;
            data.blog_id = crypto.createHash('md5').update(blogId).digest('hex');
            data.theme = theme ? theme.value : '';
            data.post_count = posts && posts.meta && posts.meta.pagination ? posts.meta.pagination.total : 0;
            data.user_count = users && users.users && users.users.length ? users.users.length : 0;
            data.blog_created_at = users && users.users && users.users[0] && users.users[0].created_at ? moment(users.users[0].created_at).unix() : '';
            data.npm_version = npm.trim();

            return data;
        } catch (err) {
            this.updateCheckError(err);
        }
    }

    /**
     * @description Perform request to update check service.
     *
     * With the privacy setting `useUpdateCheck` you can control if you want to expose data/stats from your blog to the
     * service. Enabled or disabled, you will receive the latest notification available from the service.
     *
     * @see https://ghost.org/docs/concepts/config/#privacy
     * @returns {Promise}
     */
    async updateCheckRequest() {
        const reqData = await this.updateCheckData();

        let reqObj = {
            timeout: 1000,
            headers: {}
        };

        let checkEndpoint = this.config.get('updateCheck:url');
        let checkMethod = this.config.isPrivacyDisabled('useUpdateCheck') ? 'GET' : 'POST';

        // CASE: Expose stats and do a check-in
        if (checkMethod === 'POST') {
            reqObj.json = true;
            reqObj.body = reqData;
            reqObj.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(reqData));
            reqObj.headers['Content-Type'] = 'application/json';
        } else {
            reqObj.json = true;
            reqObj.query = {
                ghost_version: reqData.ghost_version
            };
        }

        debug('Request Update Check Service', checkEndpoint);

        try {
            const response = await this.request(checkEndpoint, reqObj);
            return response.body;
        } catch (err) {
            // CASE: no notifications available, ignore
            if (err.statusCode === 404) {
                return {
                    next_check: this.nextCheckTimestamp(),
                    notifications: []
                };
            }

            // CASE: service returns JSON error, deserialize into JS error
            if (err.response && err.response.body && typeof err.response.body === 'object') {
                throw errors.utils.deserialize(err.response.body);
            } else {
                throw err;
            }
        }
    }

    /**
     * @description This function handles the response from the update check service.
     *
     * The helper does three things:
     *
     * 1. Updates the time in the settings table to know when we can execute the next update check request.
     * 2. Iterates over the received notifications and filters them out based on your notification groups.
     * 3. Calls a custom helper to generate a Ghost notification for the database.
     *
     * The structure of the response is:
     *
     * {
     *  id: 20,
     *  version: 'all4',
     *  messages:
     *     [{
     *          id: 'f8ff6c80-aa61-11e7-a126-6119te37e2b8',
     *          version: '^2',
     *          content: 'Hallouuuu custom',
     *          top: true,
     *          dismissible: true,
     *          type: 'info'
     *      }],
     *  created_at: '2021-10-06T07:00:00.000Z',
     *  custom: 1,
     *  next_check: 1555608722
     * }
     *
     *
     * Example for grouped custom notifications in config:
     *
     *  "notificationGroups": ["migration", "something"]
     *
     * The group 'all' is a reserved name for general custom notifications, which every self hosted blog can receive.
     *
     * @param {Object} response
     * @return {Promise}
     */
    async updateCheckResponse(response) {
        let notifications = [];
        let notificationGroups = (this.config.get('notificationGroups') || []).concat(['all']);

        debug('Notification Groups', notificationGroups);
        debug('Response Update Check Service', response);

        await this.api.settings.edit({
            settings: [{
                key: 'next_update_check',
                value: response.next_check
            }]
        }, internal);

        /**
         * @NOTE:
         *
         * When we refactored notifications in Ghost 1.20, the service did not support returning multiple messages.
         * But we wanted to already add the support for future functionality.
         * That's why this helper supports two ways: returning an array of messages or returning an object with
         * a "notifications" key. The second one is probably the best, because we need to support "next_check"
         * on the root level of the response.
         */
        if (_.isArray(response)) {
            notifications = response;
        } else if ((Object.prototype.hasOwnProperty.call(response, 'notifications') && _.isArray(response.notifications))) {
            notifications = response.notifications;
        } else {
            // CASE: default right now
            notifications = [response];
        }

        // CASE: Hook into received notifications and decide whether you are allowed to receive custom group messages.
        if (notificationGroups.length) {
            notifications = notifications.filter(function (notification) {
                // CASE: release notification, keep
                if (!notification.custom) {
                    return true;
                }

                // CASE: filter out messages based on your groups
                return _.includes(notificationGroups.map(function (groupIdentifier) {
                    if (notification && notification.version && notification.version.match(new RegExp(groupIdentifier))) {
                        return true;
                    }

                    return false;
                }), true) === true;
            });
        }

        for (const notification of notifications) {
            await this.createCustomNotification(notification);
        }
    }

    /**
     * @description Create a Ghost notification and call the API controller.
     *
     * @param {Object} notification
     * @return {Promise}
     */
    async createCustomNotification(notification) {
        if (!notification) {
            return;
        }

        const {users} = await this.api.users.browse(Object.assign({
            limit: 'all',
            include: ['roles']
        }, internal));

        const adminEmails = users
            .filter(user => ['Owner', 'Administrator'].includes(user.roles[0].name))
            .map(user => user.email);

        const siteUrl = this.config.get('url');

        for (const message of notification.messages) {
            const toAdd = {
                // @NOTE: the update check service returns "0" or "1" (https://github.com/TryGhost/UpdateCheck/issues/43)
                custom: !!notification.custom,
                createdAt: moment(notification.created_at).toDate(),
                status: message.status || 'alert',
                type: message.type || 'info',
                id: message.id,
                dismissible: Object.prototype.hasOwnProperty.call(message, 'dismissible') ? message.dismissible : true,
                top: !!message.top,
                message: message.content
            };

            if (toAdd.type === 'alert') {
                for (const email of adminEmails) {
                    try {
                        this.ghostMailer.send({
                            to: email,
                            subject: `Action required: Critical alert from Ghost instance ${siteUrl}`,
                            html: toAdd.message,
                            forceTextContent: true
                        });
                    } catch (err) {
                        this.logging.err(err);
                    }
                }
            }

            debug('Add Custom Notification', toAdd);
            await this.api.notifications.add({notifications: [toAdd]}, {context: {internal: true}});
        }
    }
    /**
     * @description Entry point to trigger the update check unit.
     *
     * Based on a settings value, we check if `next_update_check` is less than now to decide whether
     * we should request the update check service (http://updates.ghost.org) or not.
     *
     * @returns {Promise}
     */
    async check() {
        const result = await this.api.settings.read(_.extend({key: 'next_update_check'}, internal));

        const nextUpdateCheck = result.settings[0];

        // CASE: Next update check should happen now?
        // @NOTE: You can skip this check by adding a config value. This is helpful for developing.
        if (!this.config.get('updateCheck:forceUpdate') && nextUpdateCheck && nextUpdateCheck.value && nextUpdateCheck.value > moment().unix()) {
            return;
        }

        try {
            const response = await this.updateCheckRequest();

            return await this.updateCheckResponse(response);
        } catch (err) {
            this.updateCheckError(err);
        }
    }
}

module.exports = UpdateCheckService;
