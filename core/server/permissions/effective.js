var _ = require('lodash'),
    Models = require('../models'),
    errors = require('../errors'),
    User   = Models.User,
    App    = Models.App;

var effective = {
    user: function (id) {
        return User.findOne({id: id}, { include: ['permissions', 'roles.permissions'] })
            .then(function (foundUser) {
                var seenPerms = {},
                    rolePerms = _.map(foundUser.related('roles').models, function (role) {
                        return role.related('permissions').models;
                    }),
                    allPerms = [];

                rolePerms.push(foundUser.related('permissions').models);

                _.each(rolePerms, function (rolePermGroup) {
                    _.each(rolePermGroup, function (perm) {
                        var key = perm.get('action_type') + '-' + perm.get('object_type') + '-' + perm.get('object_id');

                        // Only add perms once
                        if (seenPerms[key]) {
                            return;
                        }

                        allPerms.push(perm);
                        seenPerms[key] = true;
                    });
                });

                return allPerms;
            }, errors.logAndThrowError);
    },

    app: function (appName) {
        return App.findOne({name: appName}, { withRelated: ['permissions'] })
            .then(function (foundApp) {
                if (!foundApp) {
                    return [];
                }

                return foundApp.related('permissions').models;
            }, errors.logAndThrowError);
    }
};

module.exports = effective;