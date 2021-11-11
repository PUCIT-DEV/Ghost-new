const fs = require('fs-extra');
const _debug = require('@tryghost/debug')._base;
const debug = _debug('ghost:services:url:service');
const _ = require('lodash');
const errors = require('@tryghost/errors');
const UrlGenerator = require('./UrlGenerator');
const Queue = require('./Queue');
const Urls = require('./Urls');
const Resources = require('./Resources');
const urlUtils = require('../../../shared/url-utils');

// This listens to services.themes.api.changed, routing events, and it's own queue events
const events = require('../../lib/common/events');

/**
 * The url service class holds all instances in a centralized place.
 * It's the public API you can talk to.
 * It will tell you if the url generation is in progress or not.
 */
class UrlService {
    /**
     *
     * @param {Object} options
     * @param {String} [options.urlCachePath] - path to store cached URLs at
     */
    constructor({urlCachePath} = {}) {
        this.utils = urlUtils;
        this.urlCachePath = urlCachePath;
        this.finished = false;
        this.urlGenerators = [];

        // Get urls
        this.urls = new Urls();
        this.queue = new Queue();
        this.resources = new Resources(this.queue);

        this._listeners();
    }

    /**
     * @description Helper function to register the listeners for this instance.
     * @private
     */
    _listeners() {
        this._onThemeChangedListener = this._onThemeChangedListener.bind(this);
        events.on('services.themes.api.changed', this._onThemeChangedListener);

        this._onQueueStartedListener = this._onQueueStarted.bind(this);
        this.queue.addListener('started', this._onQueueStartedListener);

        this._onQueueEndedListener = this._onQueueEnded.bind(this);
        this.queue.addListener('ended', this._onQueueEnded.bind(this));
    }

    /**
     * @description The queue will notify us if the queue has started with an event.
     *
     * The "init" event is basically the bootstrap event, which is the siganliser if url generation
     * is in progress or not.
     *
     * @param {String} event
     * @private
     */
    _onQueueStarted(event) {
        if (event === 'init') {
            this.finished = false;
        }
    }

    /**
     * @description The queue will notify us if the queue has ended with an event.
     * @param {String} event
     * @private
     */
    _onQueueEnded(event) {
        if (event === 'init') {
            this.finished = true;
        }
    }

    /**
     * @description Router was created, connect it with a url generator.
     * @param {ExpressRouter} router
     */
    onRouterAddedType(router) {
        debug('Registering route: ', router.name);

        let urlGenerator = new UrlGenerator(router, this.queue, this.resources, this.urls, this.urlGenerators.length);
        this.urlGenerators.push(urlGenerator);
    }

    /**
     * @description Router update handler - regenerates it's resources
     * @param {ExpressRouter} router
     */
    onRouterUpdated(router) {
        const generator = this.urlGenerators.find(g => g.router.id === router.id);
        generator.regenerateResources();
    }

    /**
     * @description If the API version in the theme config changes, we have to reset urls and resources.
     * @private
     */
    _onThemeChangedListener() {
        this.reset({keepListeners: true});
        this.init();
    }

    /**
     * @description Get Resource by url.
     *
     * You have a url and want to know which the url belongs to.
     *
     * It's in theory possible that multiple resources generate the same url,
     * but they both would serve different content.
     *
     * e.g. if we remove the slug uniqueness and you create a static
     * page and a post with the same slug. And both are served under `/` with the permalink `/:slug/`.
     *
     *
     * Each url is unique and it depends on the hierarchy of router registration is configured.
     * There is no url collision, everything depends on registration order.
     *
     * e.g. posts which live in a collection are stronger than a static page.
     *
     * We only return the resource, which would be served.
     *
     * @NOTE: only accepts relative urls at the moment.
     *
     * @param {String} url
     * @param {Object} options
     * @returns {Object}
     */
    getResource(url, options) {
        options = options || {};

        let objects = this.urls.getByUrl(url);

        if (!objects.length) {
            if (!this.hasFinished()) {
                throw new errors.InternalServerError({
                    message: 'UrlService is processing.',
                    code: 'URLSERVICE_NOT_READY'
                });
            } else {
                return null;
            }
        }

        if (objects.length > 1) {
            objects = _.reduce(objects, (toReturn, object) => {
                if (!toReturn.length) {
                    toReturn.push(object);
                } else {
                    const i1 = _.findIndex(this.urlGenerators, {uid: toReturn[0].generatorId});
                    const i2 = _.findIndex(this.urlGenerators, {uid: object.generatorId});

                    if (i2 < i1) {
                        toReturn = [];
                        toReturn.push(object);
                    }
                }

                return toReturn;
            }, []);
        }

        if (options.returnEverything) {
            return objects[0];
        }

        return objects[0].resource;
    }

    /**
     * @description Get resource by id.
     * @param {String} resourceId
     * @returns {Object}
     */
    getResourceById(resourceId) {
        const object = this.urls.getByResourceId(resourceId);

        if (!object) {
            throw new errors.NotFoundError({
                message: 'Resource not found.',
                code: 'URLSERVICE_RESOURCE_NOT_FOUND'
            });
        }

        return object.resource;
    }

    /**
     * @description Figure out if url generation is in progress or not.
     * @returns {boolean}
     */
    hasFinished() {
        return this.finished;
    }

    /**
     * @description Get url by resource id.
     *
     * If we can't find a url for an id, we have to return a url.
     * There are many components in Ghost which call `getUrlByResourceId` and
     * based on the return value, they set the resource url somewhere e.g. meta data.
     * Or if you define no collections in your yaml file and serve a page.
     * You will see a suggestion of posts, but they all don't belong to a collection.
     * They would show localhost:2368/null/.
     *
     * @param {String} id
     * @param {Object} options
     * @returns {String}
     */
    getUrlByResourceId(id, options) {
        options = options || {};

        const obj = this.urls.getByResourceId(id);

        if (obj) {
            if (options.absolute) {
                return this.utils.createUrl(obj.url, options.absolute, options.secure);
            }

            if (options.withSubdirectory) {
                return this.utils.createUrl(obj.url, false, options.secure, true);
            }

            return obj.url;
        }

        if (options.absolute) {
            return this.utils.createUrl('/404/', options.absolute, options.secure);
        }

        if (options.withSubdirectory) {
            return this.utils.createUrl('/404/', false, options.secure);
        }

        return '/404/';
    }

    /**
     * @description Check whether a router owns a resource id.
     * @param {String} routerId
     * @param {String} id
     * @returns {boolean}
     */
    owns(routerId, id) {
        debug('owns', routerId, id);

        let urlGenerator;

        this.urlGenerators.every((_urlGenerator) => {
            if (_urlGenerator.router.identifier === routerId) {
                urlGenerator = _urlGenerator;
                return false;
            }

            return true;
        });

        if (!urlGenerator) {
            return false;
        }

        return urlGenerator.hasId(id);
    }

    /**
     * @description Get permlink structure for url.
     * @param {String} url
     * @param {object} options
     * @returns {*}
     */
    getPermalinkByUrl(url, options) {
        options = options || {};

        const object = this.getResource(url, {returnEverything: true});

        if (!object) {
            return null;
        }

        return _.find(this.urlGenerators, {uid: object.generatorId}).router.getPermalinks()
            .getValue(options);
    }

    /**
     * @description Initializes components needed for the URL Service to function
     */
    async init() {
        this.resources.initResourceConfig();
        this.resources.initEvenListeners();

        const persistedUrls = await this.fetchUrls();
        if (persistedUrls) {
            this.urls = new Urls({
                urls: persistedUrls
            });
            this.finished = true;
        } else {
            await this.resources.fetchResources();
        }

        // CASE: all resources are fetched, start the queue
        this.queue.start({
            event: 'init',
            tolerance: 100,
            requiredSubscriberCount: 1
        });
    }

    async persistUrls() {
        if (!this.urlCachePath) {
            return null;
        }

        return fs.writeFileSync(this.urlCachePath, JSON.stringify(this.urls.urls, null, 4));
    }

    async fetchUrls() {
        if (!this.urlCachePath) {
            return null;
        }

        let urlsCacheExists = false;
        let urls;

        try {
            await fs.stat(this.urlCachePath);
            urlsCacheExists = true;
        } catch (e) {
            urlsCacheExists = false;
        }

        if (urlsCacheExists) {
            try {
                const urlsFile = await fs.readFile(this.urlCachePath, 'utf8');
                urls = JSON.parse(urlsFile);
            } catch (e) {
                //noop as we'd start a long boot process if there are any errors in the file
            }
        }

        return urls;
    }

    /**
     * @description Reset this service.
     * @param {Object} options
     */
    reset(options = {}) {
        debug('reset');
        this.urlGenerators = [];

        this.urls.reset();
        this.queue.reset();
        this.resources.reset();

        if (!options.keepListeners) {
            this._onQueueStartedListener && this.queue.removeListener('started', this._onQueueStartedListener);
            this._onQueueEndedListener && this.queue.removeListener('ended', this._onQueueEndedListener);
            this._onThemeChangedListener && events.removeListener('services.themes.api.changed', this._onThemeChangedListener);
        }
    }

    /**
     * @description Reset the generators.
     * @param {Object} options
     */
    resetGenerators(options = {}) {
        debug('resetGenerators');
        this.finished = false;
        this.urlGenerators = [];
        this.urls.reset();
        this.queue.reset();

        if (options.releaseResourcesOnly) {
            this.resources.releaseAll();
        } else {
            this.resources.softReset();
        }
    }

    /**
     * @description Soft reset this service. Only used in test env.
     */
    softReset() {
        debug('softReset');
        this.finished = false;
        this.urls.softReset();
        this.queue.softReset();
        this.resources.softReset();
    }
}

module.exports = UrlService;
