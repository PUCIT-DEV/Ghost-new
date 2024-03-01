const sentry = require('./shared/sentry');
const express = require('./shared/express');
const config = require('./shared/config');
const urlService = require('./server/services/url');

const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

const isMaintenanceModeEnabled = (req) => {
    if (req.app.get('maintenance') || config.get('maintenance').enabled || !urlService.hasFinished()) {
        return true;
    }

    return false;
};

// We never want middleware functions to be anonymous
const maintenanceMiddleware = (req, res, next) => {
    if (!isMaintenanceModeEnabled(req)) {
        return next();
    }

    res.set({
        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    });
    res.writeHead(503, {'content-type': 'text/html'});
    fs.createReadStream(path.resolve(__dirname, './server/views/maintenance.html')).pipe(res);
};

function createRequestBatchingMiddleware(options = {}) {
    /**
     * @type {Map.<string, {req: import('express').Request, res: import('express').Response, next: import('express').NextFunction}[]>}
     */
    const globalRequestMap = new Map();

    const shouldBatchRequest = options.shouldBatchRequest || function shouldBatchRequest(req) {
        return true;
    };

    const getKeyForRequest = options.getKeyForRequest || function getKeyForRequest(req) {
        return req.method + req.url;
    };

    /**
     *
     * @param {string} key
     * @param {Map.<string, {req: import('express').Request, res: import('express').Response, next: import('express').NextFunction}[]>} requestMap
     * @returns
     */
    function runNextRequest(key, requestMap) {
        const requests = requestMap.get(key);
        const requestToRun = requests.shift();
        function onError() {
            runNextRequest(key, requestMap);
        }
        function onSuccess(statusCode, headers, data) {
            requestMap.delete(key);
            for (const request of requests) {
                process.nextTick(() => {
                    request.res.statusCode = statusCode;
                    request.res.set(headers);
                    request.res.send(data);
                });
            }
        }
        patchResponse(requestToRun, onError, onSuccess);
        requestToRun.next();
    }

    /**
     * @param {object} data
     * @param {import('express').Response} data.res
     */
    function patchResponse({res}, onError, onSuccess) {
        const expressSend = res.send;
        let handled = false;
        res.on('close', function () {
            if (handled) {
                return;
            }
            onError();
        });

        res.send = function patchedSend(data) {
            handled = true;
            const statusCode = res.statusCode;
            const headers = res.getHeaders();
            onSuccess(statusCode, headers, data);
            return expressSend.call(res, data);
        };
    }

    return function requestBatchingHandler(req, res, next) {
        if (!shouldBatchRequest(req)) {
            return next();
        }
        const key = getKeyForRequest(req);
        if (!key) {
            return next();
        }

        let similarRequests = globalRequestMap.get(key);
        if (!similarRequests) {
            similarRequests = [{req, res, next}];
            globalRequestMap.set(key, similarRequests);
            return runNextRequest(key, globalRequestMap);
        } else {
            similarRequests.push({req, res, next});
        }
    };
}

const rootApp = () => {
    const app = express('root');
    app.use(sentry.requestHandler);
    if (config.get('sentry')?.tracing?.enabled === true) {
        app.use(sentry.tracingHandler);
    }
    app.enable('maintenance');
    app.use(maintenanceMiddleware);
    app.use(createRequestBatchingMiddleware({
        shouldBatchRequest(req) {
            return req.method === 'GET' && !req.url.startsWith('/ghost') && !req.url.startsWith('/content');
        },
        getKeyForRequest(req) {
            return req.method + req.url;
        }
    }));

    return app;
};

module.exports = rootApp;
