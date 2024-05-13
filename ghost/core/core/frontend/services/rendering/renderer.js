const path = require('path');
const debug = require('@tryghost/debug')('services:routing:renderer:renderer');
const {IncorrectUsageError} = require('@tryghost/errors');
const setContext = require('./context');
const templates = require('./templates');
const tpl = require('@tryghost/tpl');
const messages = {
    couldNotReadFile: 'Could not read file {file}'
};

/**
 * @description Helper function to finally render the data.
 * @param {Object} req
 * @param {Object} res
 * @param {Object} data
 */
module.exports = function renderer(req, res, data) {
    // Set response context
    setContext(req, res, data);

    // Set template
    templates.setTemplate(req, res, data);

    debug('Rendering template: ' + res._template + ' for: ' + req.originalUrl);
    debug('res.locals', res.locals);

    // CASE: You can set the content type of the page in your routes.yaml file
    if (res.routerOptions && res.routerOptions.contentType) {
        if (res.routerOptions.templates.indexOf(res._template) !== -1) {
            res.type(res.routerOptions.contentType);
        }
    }

    // Render Call
    res.render(res._template, data, function (err, html) {
        if (err) {
            if (err.code === 'ENOENT') {
                return req.next(
                    new IncorrectUsageError({
                        message: tpl(messages.couldNotReadFile, {file: path.basename(err.path)})
                    })
                );
            }
            return req.next(err);
        }
        // Only cache members content if the site is explicitly configured to do so
        // This is an experimental feature and should not be enabled by default
        if (res.locals.member) {
            // Insert logic to check if we're using specific members data here
            // For now we're only enabling this on sites that we have pre-verified do not use @member.name or other specific member data
            // Get the member's active subscription to determine which tier to cache the page for
            const activeSubscription = res.locals.member.subscriptions.find(sub => sub.status === 'active');
            const memberTier = activeSubscription && activeSubscription.tier.slug || 'free';
            res.setHeader('X-Member-Cache-Tier', memberTier);
        }
        res.send(html);
    });
};
