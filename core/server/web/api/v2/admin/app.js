const debug = require('ghost-ignition').debug('web:v2:admin:app');
const boolParser = require('express-query-boolean');
const express = require('express');
const bodyParser = require('body-parser');
const shared = require('../../../shared');
const mw = require('../../middleware');
const routes = require('./routes');
const sentry = require('../../../../sentry');

module.exports = function setupApiApp() {
    debug('Admin API v2 setup start');
    const apiApp = express();
    apiApp.use(sentry.requestHandler);

    // API middleware

    // Body parsing
    apiApp.use(bodyParser.json({limit: '1mb'}));
    apiApp.use(bodyParser.urlencoded({extended: true, limit: '1mb'}));

    // Query parsing
    apiApp.use(boolParser());

    // send 503 json response in case of maintenance
    apiApp.use(shared.middlewares.maintenance);

    // Check version matches for API requests, depends on res.locals.safeVersion being set
    // Therefore must come after themeHandler.ghostLocals, for now
    apiApp.use(mw.versionMatch);

    // Admin API shouldn't be cached
    apiApp.use(shared.middlewares.cacheControl('private'));

    // Routing
    apiApp.use(routes());

    // API error handling
    apiApp.use(sentry.errorHandler);
    apiApp.use(shared.middlewares.errorHandler.resourceNotFound);
    apiApp.use(shared.middlewares.errorHandler.handleJSONResponseV2);

    debug('Admin API v2 setup end');

    return apiApp;
};
