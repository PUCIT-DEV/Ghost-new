var fs = require('fs'),
    session = require('cookie-session'),
    crypto = require('crypto'),
    path = require('path'),
    config = require('../../../config'),
    utils = require('../../../utils'),
    i18n = require('../../../i18n'),
    settingsCache = require('../../../settings/cache'),
    privateRoute = '/' + config.get('routeKeywords').private + '/',
    privateBlogging;

function verifySessionHash(salt, hash) {
    if (!salt || !hash) {
        return false;
    }

    var hasher = crypto.createHash('sha256');
    hasher.update(settingsCache.get('password') + salt, 'utf8');
    return hasher.digest('hex') === hash;
}

privateBlogging = {
    checkIsPrivate: function checkIsPrivate(req, res, next) {
        var isPrivateBlog = settingsCache.get('is_private');

        if (!isPrivateBlog) {
            res.isPrivateBlog = false;
            return next();
        }

        res.isPrivateBlog = true;

        return session({
            maxAge: utils.ONE_MONTH_MS,
            signed: false
        })(req, res, next);
    },

    filterPrivateRoutes: function filterPrivateRoutes(req, res, next) {
        if (res.isAdmin || !res.isPrivateBlog || req.url.lastIndexOf(privateRoute, 0) === 0) {
            return next();
        }

        if (req.url.lastIndexOf('/robots.txt', 0) === 0) {
            return fs.readFile(path.resolve(__dirname, '../', 'robots.txt'), function readFile(err, buf) {
                if (err) {
                    return next(err);
                }

                res.writeHead(200, {
                    'Content-Type': 'text/plain',
                    'Content-Length': buf.length,
                    'Cache-Control': 'public, max-age=' + config.get('caching:robotstxt:maxAge')
                });

                res.end(buf);
            });
        }

        privateBlogging.authenticatePrivateSession(req, res, next);
    },

    authenticatePrivateSession: function authenticatePrivateSession(req, res, next) {
        var hash = req.session.token || '',
            salt = req.session.salt || '',
            isVerified = verifySessionHash(salt, hash),
            url;

        if (isVerified) {
            return next();
        } else {
            url = utils.url.urlFor({relativeUrl: privateRoute});
            url += req.url === '/' ? '' : '?r=' + encodeURIComponent(req.url);
            return res.redirect(url);
        }
    },

    // This is here so a call to /private/ after a session is verified will redirect to home;
    isPrivateSessionAuth: function isPrivateSessionAuth(req, res, next) {
        if (!res.isPrivateBlog) {
            return res.redirect(utils.url.urlFor('home', true));
        }

        var hash = req.session.token || '',
            salt = req.session.salt || '',
            isVerified = verifySessionHash(salt, hash);

        if (isVerified) {
            // redirect to home if user is already authenticated
            return res.redirect(utils.url.urlFor('home', true));
        } else {
            return next();
        }
    },

    authenticateProtection: function authenticateProtection(req, res, next) {
        // if errors have been generated from the previous call
        if (res.error) {
            return next();
        }

        var bodyPass = req.body.password,
            pass = settingsCache.get('password'),
            hasher = crypto.createHash('sha256'),
            salt = Date.now().toString(),
            forward = req.query && req.query.r ? req.query.r : '/';

        if (pass === bodyPass) {
            hasher.update(bodyPass + salt, 'utf8');
            req.session.token = hasher.digest('hex');
            req.session.salt = salt;

            return res.redirect(utils.url.urlFor({relativeUrl: decodeURIComponent(forward)}));
        } else {
            res.error = {
                message: i18n.t('errors.middleware.privateblogging.wrongPassword')
            };
            return next();
        }
    }
};

module.exports = privateBlogging;
