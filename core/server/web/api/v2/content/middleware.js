const prettyURLs = require('../../../shared/middlewares/pretty-urls');
const cors = require('../../../shared/middlewares/api/cors');
const {adminRedirect} = require('../../../shared/middlewares/url-redirects');
const auth = require('../../../../services/auth');

/**
 * Auth Middleware Packages
 *
 * IMPORTANT
 * - cors middleware MUST happen before pretty urls, because otherwise cors header can get lost on redirect
 * - cors middleware MUST happen after authenticateClient, because authenticateClient reads the trusted domains
 * - url redirects MUST happen after cors, otherwise cors header can get lost on redirect
 */

/**
 * Authentication for public endpoints
 */
module.exports.authenticatePublic = [
    auth.authenticate.authenticateClient,
    auth.authenticate.authenticateUser,
    // This is a labs-enabled middleware
    auth.authorize.requiresAuthorizedUserPublicAPI,
    cors,
    adminRedirect,
    prettyURLs
];
