var https           = require('https'),
    url             = require('url'),
    Promise         = require('bluebird'),
    errors          = require('../../errors'),
    logging         = require('../../logging'),
    utils           = require('../../utils'),
    events          = require('../../events'),
    logging          = require('../../logging'),
    api             = require('../../api/settings'),
    i18n            = require('../../i18n'),
    schema          = require('../schema').checks,
    options,
    req,
    slackData = {};

function getSlackSettings() {
    return api.read({context: {internal: true}, key: 'slack'}).then(function (response) {
        var slackSetting = response.settings[0].value;

        try {
            slackSetting = JSON.parse(slackSetting);
        } catch (e) {
            return Promise.reject(e);
        }

        return slackSetting[0];
    });
}

function makeRequest(reqOptions, reqPayload) {
    req = https.request(reqOptions);

    reqPayload = JSON.stringify(reqPayload);

    req.write(reqPayload);
    req.on('error', function (err) {
        logging.error(new errors.GhostError({
            err: err,
            context: i18n.t('errors.data.xml.xmlrpc.pingUpdateFailed.error'),
            help: i18n.t('errors.data.xml.xmlrpc.pingUpdateFailed.help', {url: 'http://support.ghost.org'})
        }));
    });

    req.end();
}

function ping(post) {
    var message;

    // If this is a post, we want to send the link of the post
    if (schema.isPost(post)) {
        message = utils.url.urlFor('post', {post: post}, true);
    } else {
        message = post.message;
    }

    return getSlackSettings().then(function (slackSettings) {
        // Quit here if slack integration is not activated

        if (slackSettings.url && slackSettings.url !== '') {
            // Only ping when not a page
            if (post.page) {
                return;
            }

            // Don't ping for the welcome to ghost post.
            // This also handles the case where during ghost's first run
            // models.init() inserts this post but permissions.init() hasn't
            // (can't) run yet.
            if (post.slug === 'welcome-to-ghost') {
                return;
            }

            slackData = {
                text: message,
                unfurl_links: true,
                icon_url: utils.url.urlFor({relativeUrl: '/ghost/img/ghosticon.jpg'}, {}, true),
                username: 'Ghost'
            };

            // fill the options for https request
            options = url.parse(slackSettings.url);
            options.method = 'POST';
            options.headers = {'Content-type': 'application/json'};

            // with all the data we have, we're doing the request now
            makeRequest(options, slackData);
        } else {
            return;
        }
    });
}

function listener(model) {
    ping(model.toJSON());
}

function testPing() {
    ping({
        message: 'Heya! This is a test notification from your Ghost blog :simple_smile:. Seems to work fine!'
    });
}

function listen() {
    events.on('post.published', listener);
    events.on('slack.test', testPing);
}

// Public API
module.exports = {
    listen: listen
};
