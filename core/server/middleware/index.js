// # Custom Middleware
// The following custom middleware functions cannot yet be unit tested, and as such are kept separate from
// the testable custom middleware functions in middleware.js

var middleware = require('./middleware'),
    express     = require('express'),
    _           = require('underscore'),
    url         = require('url'),
    when        = require('when'),
    slashes     = require('connect-slashes'),
    errors      = require('../errorHandling'),
    api         = require('../api'),
    path        = require('path'),
    hbs         = require('express-hbs'),
    config      = require('../config'),
    storage     = require('../storage'),
    packageInfo = require('../../../package.json'),
    BSStore     = require('../bookshelf-session'),
    models      = require('../models'),

    expressServer;

// ##Custom Middleware

// ### GhostLocals Middleware
// Expose the standard locals that every external page should have available,
// separating between the theme and the admin
function ghostLocals(req, res, next) {
    // Make sure we have a locals value.
    res.locals = res.locals || {};
    res.locals.version = packageInfo.version;
    res.locals.path = req.path;
    // Strip off the subdir part of the path
    res.locals.ghostRoot = req.path.replace(config.paths().webroot, '');

    if (res.isAdmin) {
        res.locals.csrfToken = req.csrfToken();
        when.all([
            api.users.read({id: req.session.user}),
            api.notifications.browse()
        ]).then(function (values) {
            var currentUser = values[0],
                notifications = values[1];

            _.extend(res.locals,  {
                currentUser: {
                    name: currentUser.name,
                    email: currentUser.email,
                    image: currentUser.image
                },
                messages: notifications
            });
            next();
        }).otherwise(function () {
            // Only show passive notifications
            api.notifications.browse().then(function (notifications) {
                _.extend(res.locals, {
                    messages: _.reject(notifications, function (notification) {
                        return notification.status !== 'passive';
                    })
                });
                next();
            });
        });
    } else {
        next();
    }
}

// ### InitViews Middleware
// Initialise Theme or Admin Views
function initViews(req, res, next) {
    /*jslint unparam:true*/

    if (!res.isAdmin) {
        hbs.updateTemplateOptions({ data: {blog: config.theme()} });
        expressServer.engine('hbs', expressServer.get('theme view engine'));
        expressServer.set('views', path.join(config.paths().themePath, expressServer.get('activeTheme')));
    } else {
        expressServer.engine('hbs', expressServer.get('admin view engine'));
        expressServer.set('views', config.paths().adminViews);
    }

    next();
}

// ### Activate Theme
// Helper for manageAdminAndTheme
function activateTheme(activeTheme) {
    var hbsOptions,
        stackLocation = _.indexOf(expressServer.stack, _.find(expressServer.stack, function (stackItem) {
            return stackItem.route === '' && stackItem.handle.name === 'settingEnabled';
        }));

    // clear the view cache
    expressServer.cache = {};
    expressServer.disable(expressServer.get('activeTheme'));
    expressServer.set('activeTheme', activeTheme);
    expressServer.enable(expressServer.get('activeTheme'));
    if (stackLocation) {
        expressServer.stack[stackLocation].handle = middleware.whenEnabled(expressServer.get('activeTheme'), middleware.staticTheme());
        expressServer.stack[stackLocation].route = config.paths().webroot;
    }

    // set view engine
    hbsOptions = { partialsDir: [ config.paths().helperTemplates ] };
    if (config.paths().availableThemes[activeTheme].hasOwnProperty('partials')) {
        // Check that the theme has a partials directory before trying to use it
        hbsOptions.partialsDir.push(path.join(config.paths().themePath, activeTheme, 'partials'));
    }
    expressServer.set('theme view engine', hbs.express3(hbsOptions));

    // Update user error template
    errors.updateActiveTheme(activeTheme);
}

 // ### ManageAdminAndTheme Middleware
// Uses the URL to detect whether this response should be an admin response
// This is used to ensure the right content is served, and is not for security purposes
function manageAdminAndTheme(req, res, next) {
    res.isAdmin = req.url.lastIndexOf(config.paths().webroot + '/ghost/', 0) === 0;

    if (res.isAdmin) {
        expressServer.enable('admin');
        expressServer.disable(expressServer.get('activeTheme'));
    } else {
        expressServer.enable(expressServer.get('activeTheme'));
        expressServer.disable('admin');
    }
    api.settings.read('activeTheme').then(function (activeTheme) {
        // Check if the theme changed
        if (activeTheme.value !== expressServer.get('activeTheme')) {
            // Change theme
            if (!config.paths().availableThemes.hasOwnProperty(activeTheme.value)) {
                if (!res.isAdmin) {
                    // Throw an error if the theme is not available, but not on the admin UI
                    errors.logAndThrowError('The currently active theme ' + activeTheme.value + ' is missing.');
                }
            } else {
                activateTheme(activeTheme.value);
            }
        }
        next();
    });
}

// Redirect to signup if no users are currently created
function redirectToSignup(req, res, next) {
    var root = config.paths().webroot;
    /*jslint unparam:true*/
    api.users.browse().then(function (users) {
        if (users.length === 0) {
            return res.redirect(root + '/ghost/signup/');
        }
        next();
    }).otherwise(function (err) {
        return next(new Error(err));
    });
}

function isSSLrequired(isAdmin) {
    var forceSSL = url.parse(config().url).protocol === 'https:' ? true : false,
        forceAdminSSL = (isAdmin && config().forceAdminSSL);
    if (forceSSL || forceAdminSSL) {
        return true;
    }
    return false;
}

// Check to see if we should use SSL
// and redirect if needed
function checkSSL(req, res, next) {
    if (isSSLrequired(res.isAdmin)) {
        // Check if X-Forarded-Proto headers are sent, if they are check for https.
        // If they are not assume true to avoid infinite redirect loop.
        // If the X-Forwarded-Proto header is missing and Express cannot automatically sense HTTPS the redirect will not be made.
        var httpsHeader = req.header('X-Forwarded-Proto') !== undefined ? req.header('X-Forwarded-Proto').toLowerCase() === 'https' ? true : false : true;
        if (!req.secure && !httpsHeader) {
            return res.redirect(301, url.format({
                protocol: 'https:',
                hostname: url.parse(config().url).hostname,
                pathname: req.path,
                query: req.query
            }));
        }
    }
    next();
}

module.exports = function (server, dbHash) {
    var oneHour = 60 * 60 * 1000,
        oneYear = 365 * 24 * oneHour,
        root = config.paths().webroot,
        corePath = config.paths().corePath,
        cookie;

    // Cache express server instance
    expressServer = server;
    middleware.cacheServer(expressServer);

    // Logging configuration
    if (expressServer.get('env') !== 'development') {
        expressServer.use(express.logger());
    } else {
        expressServer.use(express.logger('dev'));
    }

    // Favicon
    expressServer.use(root, express.favicon(corePath + '/shared/favicon.ico'));

    // Shared static config
    expressServer.use(root + '/shared', express['static'](path.join(corePath, '/shared')));

    expressServer.use(root + '/content/images', storage.get_storage().serve());

    // Serve our built scripts; can't use /scripts here because themes already are
    expressServer.use(root + '/built/scripts', express['static'](path.join(corePath, '/built/scripts'), {
        // Put a maxAge of one year on built scripts
        maxAge: oneYear
    }));

    // First determine whether we're serving admin or theme content
    expressServer.use(manageAdminAndTheme);

    // Force SSL
    expressServer.use(checkSSL);

    // Admin only config
    expressServer.use(root + '/ghost', middleware.whenEnabled('admin', express['static'](path.join(corePath, '/client/assets'))));

    // Theme only config
    expressServer.use(middleware.whenEnabled(expressServer.get('activeTheme'), middleware.staticTheme()));

    // Add in all trailing slashes
    expressServer.use(slashes());

    expressServer.use(express.json());
    expressServer.use(express.urlencoded());

    expressServer.use(root + '/ghost/upload/', middleware.busboy);
    expressServer.use(root + '/ghost/api/v0.1/db/', middleware.busboy);

    // Session handling
    cookie = {
        path: root + '/ghost',
        maxAge: 12 * oneHour
    };

    // if SSL is forced, add secure flag to cookie
    // parameter is true, since cookie is used with admin only
    if (isSSLrequired(true)) {
        cookie.secure = true;
    }

    expressServer.use(express.cookieParser());
    expressServer.use(express.session({
        store: new BSStore(models),
        proxy: true,
        secret: dbHash,
        cookie: cookie
    }));

    //enable express csrf protection
    expressServer.use(middleware.conditionalCSRF);
    // local data
    expressServer.use(ghostLocals);
    // So on every request we actually clean out reduntant passive notifications from the server side
    expressServer.use(middleware.cleanNotifications);

     // Initialise the views
    expressServer.use(initViews);

    // process the application routes
    expressServer.use(root, expressServer.router);

    // ### Error handling
    // 404 Handler
    expressServer.use(errors.error404);

    // 500 Handler
    expressServer.use(errors.error500);
};

// Export middleware functions directly
module.exports.middleware = middleware;
// Expose middleware functions in this file as well
module.exports.middleware.redirectToSignup = redirectToSignup;
