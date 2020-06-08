const Promise = require('bluebird');
const _ = require('lodash');
const validator = require('validator');
const models = require('../../models');
const routing = require('../../../frontend/services/routing');
const {i18n} = require('../../lib/common');
const {BadRequestError, NoPermissionError, NotFoundError} = require('@tryghost/errors');
const settingsCache = require('../../services/settings/cache');
const membersService = require('../../services/members');

const SETTINGS_BLACKLIST = [
    'members_public_key',
    'members_private_key',
    'members_session_secret'
];

module.exports = {
    docName: 'settings',

    browse: {
        options: ['type'],
        permissions: true,
        query(frame) {
            let settings = settingsCache.getAll();

            // CASE: no context passed (functional call)
            if (!frame.options.context) {
                return Promise.resolve(settings.filter((setting) => {
                    return setting.type === 'blog';
                }));
            }

            // CASE: omit core settings unless internal request
            if (!frame.options.context.internal) {
                settings = _.filter(settings, (setting) => {
                    const isCore = setting.type === 'core';
                    const isBlacklisted = SETTINGS_BLACKLIST.includes(setting.key);
                    return !isBlacklisted && !isCore;
                });
            }

            return settings;
        }
    },

    read: {
        options: ['key'],
        validation: {
            options: {
                key: {
                    required: true
                }
            }
        },
        permissions: {
            identifier(frame) {
                return frame.options.key;
            }
        },
        query(frame) {
            let setting = settingsCache.get(frame.options.key, {resolve: false});

            if (!setting) {
                return Promise.reject(new NotFoundError({
                    message: i18n.t('errors.api.settings.problemFindingSetting', {
                        key: frame.options.key
                    })
                }));
            }

            // @TODO: handle in settings model permissible fn
            if (setting.type === 'core' && !(frame.options.context && frame.options.context.internal)) {
                return Promise.reject(new NoPermissionError({
                    message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
                }));
            }

            return {
                [frame.options.key]: setting
            };
        }
    },

    validateMembersFromEmail: {
        options: [
            'token'
        ],
        permissions: false,
        validation: {
            options: {
                token: {
                    required: true
                }
            }
        },
        async query(frame) {
            // This is something you have to do if you want to use the "framework" with access to the raw req/res
            frame.response = async function (req, res) {
                try {
                    const updatedFromAddress = membersService.settings.getEmailFromToken({token: frame.options.token});
                    if (updatedFromAddress) {
                        let subscriptionSetting = settingsCache.get('members_subscription_settings', {resolve: false});
                        const settingsValue = subscriptionSetting.value ? JSON.parse(subscriptionSetting.value) : {};
                        settingsValue.fromAddress = updatedFromAddress;
                        return models.Settings.edit({
                            key: 'members_subscription_settings',
                            value: JSON.stringify(settingsValue)
                        }).then(() => {
                            // Redirect to Ghost-Admin settings page
                            const adminLink = membersService.settings.getAdminRedirectLink();
                            res.redirect(adminLink);
                        });
                    } else {
                        return Promise.reject(new BadRequestError({
                            message: 'Invalid token!'
                        }));
                    }
                } catch (err) {
                    return Promise.reject(new BadRequestError({
                        err,
                        message: 'Invalid token!'
                    }));
                }
            };
        }
    },

    updateMembersFromEmail: {
        permissions: {
            method: 'edit'
        },
        async query(frame) {
            const email = frame.data.from_address;
            if (typeof email !== 'string' || !validator.isEmail(email)) {
                throw new BadRequestError({
                    message: i18n.t('errors.api.settings.invalidEmailReceived')
                });
            }
            try {
                // Send magic link to update fromAddress
                await membersService.settings.sendFromAddressUpdateMagicLink({
                    email
                });
            } catch (err) {
                throw new BadRequestError({
                    err,
                    message: i18n.t('errors.mail.failedSendingEmail.error')
                });
            }
        }
    },

    edit: {
        headers: {
            cacheInvalidate: true
        },
        permissions: {
            unsafeAttrsObject(frame) {
                return _.find(frame.data.settings, {key: 'labs'});
            },
            async before(frame) {
                if (frame.options.context && frame.options.context.internal) {
                    return;
                }

                const firstCoreSetting = frame.data.settings.find(setting => setting.type === 'core');
                if (firstCoreSetting) {
                    throw new NoPermissionError({
                        message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
                    });
                }
            }
        },
        async query(frame) {
            const stripeConnectIntegrationToken = frame.data.settings.find(setting => setting.key === 'stripe_connect_integration_token');

            // The `stripe_connect_integration_token` "setting" is only used to set the `stripe_connect_integration` setting.
            // The `stripe_connect_integration` setting is not allowed to be set directly.
            const settings = frame.data.settings.filter((setting) => {
                return !['stripe_connect_integration', 'stripe_connect_integration_token'].includes(setting.key);
            });

            const getSetting = setting => settingsCache.get(setting.key, {resolve: false});

            const firstUnknownSetting = settings.find(setting => !getSetting(setting));

            if (firstUnknownSetting) {
                throw new NotFoundError({
                    message: i18n.t('errors.api.settings.problemFindingSetting', {
                        key: firstUnknownSetting.key
                    })
                });
            }

            if (!(frame.options.context && frame.options.context.internal)) {
                const firstCoreSetting = settings.find(setting => getSetting(setting).type === 'core');
                if (firstCoreSetting) {
                    throw new NoPermissionError({
                        message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')
                    });
                }
            }

            if (stripeConnectIntegrationToken && stripeConnectIntegrationToken.value) {
                const getSessionProp = prop => frame.original.session[prop];
                try {
                    const data = await membersService.stripeConnect.getStripeConnectTokenData(stripeConnectIntegrationToken.value, getSessionProp);
                    settings.push({
                        key: 'stripe_connect_integration',
                        value: JSON.stringify(data)
                    });
                } catch (err) {
                    throw new BadRequestError({
                        err,
                        message: 'The Stripe Connect token could not be parsed.'
                    });
                }
            }

            return models.Settings.edit(settings, frame.options);
        }
    },

    upload: {
        headers: {
            cacheInvalidate: true
        },
        permissions: {
            method: 'edit'
        },
        query(frame) {
            return routing.settings.setFromFilePath(frame.file.path);
        }
    },

    download: {
        headers: {
            disposition: {
                type: 'yaml',
                value: 'routes.yaml'
            }
        },
        response: {
            format: 'plain'
        },
        permissions: {
            method: 'browse'
        },
        query() {
            return routing.settings.get();
        }
    }
};
