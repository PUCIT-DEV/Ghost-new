const _ = require('lodash');
const debug = require('@tryghost/debug')('error-handler');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const sentry = require('../../../../shared/sentry');

const messages = {
    pageNotFound: 'Page not found',
    resourceNotFound: 'Resource not found',
    actions: {
        images: {
            upload: 'upload image'
        }
    },
    userMessages: {
        BookshelfRelationsError: 'Database error, cannot {action}.',
        InternalServerError: 'Internal server error, cannot {action}.',
        IncorrectUsageError: 'Incorrect usage error, cannot {action}.',
        NotFoundError: 'Resource not found error, cannot {action}.',
        BadRequestError: 'Request not understood error, cannot {action}.',
        UnauthorizedError: 'Authorisation error, cannot {action}.',
        NoPermissionError: 'Permission error, cannot {action}.',
        ValidationError: 'Validation error, cannot {action}.',
        UnsupportedMediaTypeError: 'Unsupported media error, cannot {action}.',
        TooManyRequestsError: 'Too many requests error, cannot {action}.',
        MaintenanceError: 'Server down for maintenance, cannot {action}.',
        MethodNotAllowedError: 'Method not allowed, cannot {action}.',
        RequestEntityTooLargeError: 'Request too large, cannot {action}.',
        TokenRevocationError: 'Token is not available, cannot {action}.',
        VersionMismatchError: 'Version mismatch error, cannot {action}.',
        DataExportError: 'Error exporting content.',
        DataImportError: 'Duplicated entry, cannot save {action}.',
        DatabaseVersionError: 'Database version compatibility error, cannot {action}.',
        EmailError: 'Error sending email!',
        ThemeValidationError: 'Theme validation error, cannot {action}.',
        HostLimitError: 'Host Limit error, cannot {action}.',
        DisabledFeatureError: 'Theme validation error, the {{{helperName}}} helper is not available. Cannot {action}.',
        UpdateCollisionError: 'Saving failed! Someone else is editing this post.'
    }
};

const updateStack = (err) => {
    let stackbits = err.stack.split(/\n/g);

    // We build this up backwards, so we always insert at position 1

    if (process.env.NODE_ENV === 'production' || err.statusCode === 404) {
        // In production mode, remove the stack trace
        stackbits.splice(1, stackbits.length - 1);
    } else {
        // In dev mode, clearly mark the strack trace
        stackbits.splice(1, 0, `Stack Trace:`);
    }

    // Add in our custom cotext and help methods

    if (err.help) {
        stackbits.splice(1, 0, `${err.help}`);
    }

    if (err.context) {
        stackbits.splice(1, 0, `${err.context}`);
    }

    return stackbits.join('\n');
};

/**
 * Get an error ready to be shown the the user
 */
module.exports.prepareError = (err, req, res, next) => {
    debug(err);

    if (Array.isArray(err)) {
        err = err[0];
    }

    if (!errors.utils.isIgnitionError(err)) {
        // We need a special case for 404 errors
        if (err.statusCode && err.statusCode === 404) {
            err = new errors.NotFoundError({
                err: err
            });
        } else {
            err = new errors.GhostError({
                err: err,
                message: err.message,
                statusCode: err.statusCode
            });
        }
    }

    // used for express logging middleware see core/server/app.js
    req.err = err;

    // alternative for res.status();
    res.statusCode = err.statusCode;

    err.stack = updateStack(err);

    // never cache errors
    res.set({
        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    });

    next(err);
};

const jsonErrorRenderer = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    res.json({
        errors: [{
            message: err.message,
            context: err.context,
            help: err.help,
            errorType: err.errorType,
            errorDetails: err.errorDetails,
            ghostErrorCode: err.ghostErrorCode
        }]
    });
};

const jsonErrorRendererV2 = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    const userError = prepareUserMessage(err, req);

    res.json({
        errors: [{
            message: userError.message || null,
            context: userError.context || null,
            type: err.errorType || null,
            details: err.errorDetails || null,
            property: err.property || null,
            help: err.help || null,
            code: err.code || null,
            id: err.id || null
        }]
    });
};

const prepareUserMessage = (err, res) => {
    const userError = {
        message: err.message,
        context: err.context
    };

    const docName = _.get(res, 'frameOptions.docName');
    const method = _.get(res, 'frameOptions.method');

    if (docName && method) {
        let action;

        const actionMap = {
            browse: 'list',
            read: 'read',
            add: 'save',
            edit: 'edit',
            destroy: 'delete'
        };

        if (_.get(messages.actions, [docName, method])) {
            action = tpl(messages.actions[docName][method]);
        } else if (Object.keys(actionMap).includes(method)) {
            let resource = docName;

            if (method !== 'browse') {
                resource = resource.replace(/s$/, '');
            }

            action = `${actionMap[method]} ${resource}`;
        }

        if (action) {
            if (err.context) {
                userError.context = `${err.message} ${err.context}`;
            } else {
                userError.context = err.message;
            }

            userError.message = tpl(messages.userMessages[err.name], {action: action});
        }
    }

    return userError;
};

module.exports.resourceNotFound = (req, res, next) => {
    next(new errors.NotFoundError({message: tpl(messages.resourceNotFound)}));
};

module.exports.pageNotFound = (req, res, next) => {
    next(new errors.NotFoundError({message: tpl(messages.pageNotFound)}));
};

module.exports.handleJSONResponse = [
    // Make sure the error can be served
    module.exports.prepareError,
    // Handle the error in Sentry
    sentry.errorHandler,
    // Render the error using JSON format
    jsonErrorRenderer
];

module.exports.handleJSONResponseV2 = [
    // Make sure the error can be served
    module.exports.prepareError,
    // Handle the error in Sentry
    sentry.errorHandler,
    // Render the error using JSON format
    jsonErrorRendererV2
];

module.exports.handleHTMLResponse = [
    // Make sure the error can be served
    module.exports.prepareError,
    // Handle the error in Sentry
    sentry.errorHandler
];
