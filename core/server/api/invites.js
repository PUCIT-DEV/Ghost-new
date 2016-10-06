var _ = require('lodash'),
    Promise = require('bluebird'),
    pipeline = require('../utils/pipeline'),
    dataProvider = require('../models'),
    settings = require('./settings'),
    mail = require('./../mail'),
    apiMail = require('./mail'),
    globalUtils = require('../utils'),
    utils = require('./utils'),
    errors = require('../errors'),
    logging = require('../logging'),
    config = require('../config'),
    i18n = require('../i18n'),
    docName = 'invites',
    allowedIncludes = ['created_by', 'updated_by', 'roles'],
    invites;

invites = {
    browse: function browse(options) {
        var tasks;

        function modelQuery(options) {
            return dataProvider.Invite.findPage(options);
        }

        tasks = [
            utils.validate(docName, {opts: utils.browseDefaultOptions}),
            utils.handlePublicPermissions(docName, 'browse'),
            utils.convertOptions(allowedIncludes),
            modelQuery
        ];

        return pipeline(tasks, options);
    },

    read: function read(options) {
        var attrs = ['id', 'email'],
            tasks;

        function modelQuery(options) {
            return dataProvider.Invite.findOne(options.data, _.omit(options, ['data']));
        }

        tasks = [
            utils.validate(docName, {attrs: attrs}),
            utils.handlePublicPermissions(docName, 'read'),
            utils.convertOptions(allowedIncludes),
            modelQuery
        ];

        return pipeline(tasks, options)
            .then(function formatResponse(result) {
                if (result) {
                    return {invites: [result.toJSON(options)]};
                }

                return Promise.reject(new errors.NotFoundError({message: i18n.t('errors.api.invites.inviteNotFound')}));
            });
    },

    destroy: function destroy(options) {
        var tasks;

        function modelQuery(options) {
            return dataProvider.Invite.findOne({id: options.id}, _.omit(options, ['data']))
                .then(function (invite) {
                    if (!invite) {
                        throw new errors.NotFoundError({message: i18n.t('errors.api.invites.inviteNotFound')});
                    }

                    return invite.destroy(options).return(null);
                });
        }

        tasks = [
            utils.validate(docName, {opts: utils.idDefaultOptions}),
            utils.handlePermissions(docName, 'destroy'),
            utils.convertOptions(allowedIncludes),
            modelQuery
        ];

        return pipeline(tasks, options);
    },

    add: function add(object, options) {
        var tasks,
            loggedInUser = options.context.user,
            emailData,
            invite;

        function addInvite(options) {
            var data = options.data;

            return dataProvider.User.findOne({id: loggedInUser}, options)
                .then(function (user) {
                    if (!user) {
                        return Promise.reject(new errors.NotFoundError({message: i18n.t('errors.api.users.userNotFound')}));
                    }

                    loggedInUser = user;
                    return dataProvider.Invite.add(data.invites[0], _.omit(options, 'data'));
                })
                .then(function (_invite) {
                    invite = _invite;

                    return settings.read({key: 'title'});
                })
                .then(function (response) {
                    var baseUrl = config.get('forceAdminSSL') ? (config.get('urlSSL') || config.get('url')) : config.get('url');

                    emailData = {
                        blogName: response.settings[0].value,
                        invitedByName: loggedInUser.get('name'),
                        invitedByEmail: loggedInUser.get('email'),
                        // @TODO: resetLink sounds weird
                        resetLink: baseUrl.replace(/\/$/, '') + '/ghost/signup/' + globalUtils.encodeBase64URLsafe(invite.get('token')) + '/'
                    };

                    return mail.utils.generateContent({data: emailData, template: 'invite-user'});
                }).then(function (emailContent) {
                    var payload = {
                        mail: [{
                            message: {
                                to: invite.get('email'),
                                subject: i18n.t('common.api.users.mail.invitedByName', {
                                    invitedByName: emailData.invitedByName,
                                    blogName: emailData.blogName
                                }),
                                html: emailContent.html,
                                text: emailContent.text
                            },
                            options: {}
                        }]
                    };

                    return apiMail.send(payload, {context: {internal: true}});
                }).then(function () {
                    options.id = invite.id;
                    return dataProvider.Invite.edit({status: 'sent'}, options);
                }).then(function () {
                    invite.set('status', 'sent');
                    var inviteAsJSON = invite.toJSON();
                    return {invites: [inviteAsJSON]};
                }).catch(function (error) {
                    if (error && error.errorType === 'EmailError') {
                        error.message = i18n.t('errors.api.invites.errorSendingEmail.error', {message: error.message}) + ' ' +
                            i18n.t('errors.api.invites.errorSendingEmail.help');
                        logging.warn(error.message);
                    }

                    return Promise.reject(error);
                });
        }

        function destroyOldInvite(options) {
            var data = options.data;

            return dataProvider.Invite.findOne({email: data.invites[0].email}, _.omit(options, 'data'))
                .then(function (invite) {
                    if (!invite) {
                        return Promise.resolve(options);
                    }

                    return invite.destroy(options);
                })
                .then(function () {
                    return options;
                });
        }

        function validation(options) {
            var roleId;

            if (!options.data.invites[0].email) {
                return Promise.reject(new errors.ValidationError({message: i18n.t('errors.api.invites.emailIsRequired')}));
            }

            if (!options.data.invites[0].roles || !options.data.invites[0].roles[0]) {
                return Promise.reject(new errors.ValidationError({message: i18n.t('errors.api.invites.roleIsRequired')}));
            }

            roleId = parseInt(options.data.invites[0].roles[0].id || options.data.invites[0].roles[0], 10);

            // @TODO move this logic to permissible
            // Make sure user is allowed to add a user with this role
            return dataProvider.Role.findOne({id: roleId}).then(function (role) {
                if (role.get('name') === 'Owner') {
                    return Promise.reject(new errors.NoPermissionError({message: i18n.t('errors.api.invites.notAllowedToInviteOwner')}));
                }
            }).then(function () {
                return options;
            });
        }

        tasks = [
            utils.validate(docName, {opts: ['email']}),
            utils.handlePermissions(docName, 'add'),
            utils.convertOptions(allowedIncludes),
            validation,
            destroyOldInvite,
            addInvite
        ];

        return pipeline(tasks, object, options);
    }
};

module.exports = invites;
