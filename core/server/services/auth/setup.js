const _ = require('lodash');
const config = require('../../../shared/config');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const logging = require('@tryghost/logging');
const models = require('../../models');
const mail = require('../mail');

const messages = {
    setupAlreadyCompleted: 'Setup has already been completed.',
    setupMustBeCompleted: 'Setup must be completed before making this request.',
    setupUnableToRun: 'Database missing fixture data. Please reset database and try again.',
    sampleBlogDescription: 'Thoughts, stories and ideas.',
    yourNewGhostBlog: 'Your New Ghost Site',
    unableToSendWelcomeEmail: 'Unable to send welcome email, your site will continue to function.',
    failedThemeInstall: 'Theme {themeName} didn\'t install because of the error: {error}'
};

/**
 * Returns setup status
 *
 * @return {Promise<Boolean>}
 */
async function checkIsSetup() {
    return models.User.isSetup();
}

/**
 * Allows an assertion to be made about setup status.
 *
 * @param  {Boolean} status True: setup must be complete. False: setup must not be complete.
 * @return {Function} returns a "task ready" function
 */
function assertSetupCompleted(status) {
    return async function checkPermission(__) {
        const isSetup = await checkIsSetup();

        if (isSetup === status) {
            return __;
        }

        const completed = tpl(messages.setupAlreadyCompleted);
        const notCompleted = tpl(messages.setupMustBeCompleted);

        function throwReason(reason) {
            throw new errors.NoPermissionError({message: reason});
        }

        if (isSetup) {
            throwReason(completed);
        } else {
            throwReason(notCompleted);
        }
    };
}

async function setupUser(userData) {
    const context = {context: {internal: true}};

    const owner = await models.User.findOne({role: 'Owner', status: 'all'});

    if (!owner) {
        throw new errors.InternalServerError({
            message: tpl(messages.setupUnableToRun)
        });
    }

    const user = await models.User.setup(userData, _.extend({id: owner.id}, context));

    return {
        user: user,
        userData: userData
    };
}

async function doSettings(data, settingsAPI) {
    const context = {context: {user: data.user.id}};
    const user = data.user;
    const blogTitle = data.userData.blogTitle;

    let userSettings;

    if (!blogTitle || typeof blogTitle !== 'string') {
        return user;
    }

    userSettings = [
        {key: 'title', value: blogTitle.trim()},
        {key: 'description', value: tpl(messages.sampleBlogDescription)}
    ];

    await settingsAPI.edit({settings: userSettings}, context);

    return user;
}

async function doProduct(data, productsAPI) {
    const context = {context: {user: data.user.id}};
    const user = data.user;
    const blogTitle = data.userData.blogTitle;

    if (!blogTitle || typeof blogTitle !== 'string') {
        return user;
    }
    try {
        const page = await productsAPI.browse({limit: 1});

        const [product] = page.products;
        if (!product) {
            return data;
        }

        productsAPI.edit({products: [{name: blogTitle.trim()}]}, {context: context.context, id: product.id});
    } catch (e) {
        return data;
    }

    return data;
}

function sendWelcomeEmail(email, mailAPI) {
    if (config.get('sendWelcomeEmail')) {
        const data = {
            ownerEmail: email
        };

        return mail.utils.generateContent({data: data, template: 'welcome'})
            .then((content) => {
                const message = {
                    to: email,
                    subject: tpl(messages.yourNewGhostBlog),
                    html: content.html,
                    text: content.text
                };

                const payload = {
                    mail: [{
                        message: message,
                        options: {}
                    }]
                };

                mailAPI.send(payload, {context: {internal: true}})
                    .catch((err) => {
                        err.context = tpl(messages.unableToSendWelcomeEmail);
                        logging.error(err);
                    });
            });
    }
    return Promise.resolve();
}

async function installTheme(data, api) {
    const {theme: themeName} = data.userData;

    if (!themeName) {
        return data;
    }

    // Use the api instead of the services as the api performs extra logic
    try {
        const installResults = await api.themes.install({
            source: 'github',
            ref: themeName,
            context: {internal: true}
        });
        const theme = installResults.themes[0];

        await api.themes.activate({
            name: theme.name,
            context: {internal: true}
        });
    } catch (error) {
        //Fallback to Casper by doing nothing as the theme setting update is the last step
        logging.warn(tpl(messages.failedThemeInstall, {themeName, error: error.message}));

        await api.notifications.add({
            notifications: [{
                custom: true, //avoids update-check from deleting the notification
                type: 'warn',
                message: 'The installation of the theme you have selected wasn\'t successful.'
            }]
        }, {context: {internal: true}});
    }

    return data;
}

module.exports = {
    checkIsSetup: checkIsSetup,
    assertSetupCompleted: assertSetupCompleted,
    setupUser: setupUser,
    doSettings: doSettings,
    doProduct: doProduct,
    sendWelcomeEmail: sendWelcomeEmail,
    installTheme: installTheme
};
