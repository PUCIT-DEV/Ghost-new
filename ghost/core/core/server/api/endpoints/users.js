const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const models = require('../../models');
const permissionsService = require('../../services/permissions');
const dbBackup = require('../../data/db/backup');
const auth = require('../../services/auth');
const apiMail = require('./index').mail;
const apiSettings = require('./index').settings;
const UsersService = require('../../services/Users');
const userService = new UsersService({dbBackup, models, auth, apiMail, apiSettings});
const ALLOWED_INCLUDES = ['count.posts', 'permissions', 'roles', 'roles.permissions'];
const UNSAFE_ATTRS = ['status', 'roles'];

const messages = {
    noPermissionToAction: 'You do not have permission to perform this action',
    userNotFound: 'User not found.'
};

function permissionOnlySelf(frame) {
    const targetId = getTargetId(frame);
    const userId = frame.user.id;
    if (targetId !== userId) {
        return Promise.reject(new errors.NoPermissionError({message: tpl(messages.noPermissionToAction)}));
    }
    return Promise.resolve();
}

function getTargetId(frame) {
    return frame.options.id === 'me' ? frame.user.id : frame.options.id;
}

async function fetchOrCreatePersonalToken(userId) {
    const token = await models.ApiKey.findOne({user_id: userId}, {});

    if (!token) {
        const newToken = await models.ApiKey.add({user_id: userId, type: 'admin'});
        return newToken;
    }

    return token;
}

function shouldInvalidateCacheAfterChange(model) {
    // Model attributes that should trigger cache invalidation when changed
    // (because they affect the frontend)
    const publicAttrs = [
        'name',
        'slug',
        'profile_image',
        'cover_image',
        'bio',
        'website',
        'location',
        'facebook',
        'twitter',
        'status',
        'visibility',
        'meta_title',
        'meta_description'
    ];

    if (model.wasChanged() === false) {
        return false;
    }

    // Check if any of the changed attributes are public
    for (const attr of Object.keys(model._changed)) {
        if (publicAttrs.includes(attr) === true) {
            return true;
        }
    }

    return false;
}

async function writeStaffFields(model, userData) {
    if (!labs.isSet('NestPlayground')) {
        return;
    }

    if (!userData.social_links && !userData.custom_fields) {
        return;
    }

    const service = await GhostNestApp.resolve('StaffFieldService');

    const allStaffFields = (userData.social_links || []).concat(userData.custom_fields || []);

    for (const staffField of allStaffFields) {
        if (!staffField.id) {
            await service.createStaffField(model.id.toString(), staffField.field.id, staffField.value);
        } else {
            // Handle editing
        }
    }
}

async function attachFields(json) {
    const service = await GhostNestApp.resolve('StaffFieldService');
    const socialLinks = await service.getAllSocialLinks();
    const customFields = await service.getAllCustomFields();

    const staffFields = (await service.getStaffFields(json.id)).reduce((staffFields, field) => {
        return {
            ...staffFields,
            [field.field.id]: field
        };
    }, {});

    json.social_links = socialLinks.map((socialLink) => {
        const staffField = staffFields[socialLink.id];
        if (!staffField) {
            return null;
        }
        return {
            id: staffField.field.id,
            field: {
                id: staffField.field.id,
                name: staffField.field.name
            },
            value: staffField.value
        };
    }).filter(x => x !== null);

    json.custom_fields = customFields.map((customField) => {
        const staffField = staffFields[customField.id];
        if (!staffField) {
            return null;
        }
        return {
            id: staffField.field.id,
            field: {
                id: staffField.field.id,
                name: staffField.field.name
            },
            value: staffField.value
        };
    }).filter(x => x !== null);

    return json;
}

const GhostNestApp = require('@tryghost/ghost');
const labs = require('../../../shared/labs');

module.exports = {
    docName: 'users',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'filter',
            'fields',
            'limit',
            'order',
            'page',
            'debug'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            }
        },
        permissions: true,
        async query(frame) {
            const page = await models.User.findPage(frame.options);

            if (labs.isSet('NestPlayground')) {
                page.data = await Promise.all(page.data.map(async (model) => {
                    const json = model.toJSON();
                    await attachFields(json);
                    return json;
                }));
            }

            return page;
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'include',
            'filter',
            'fields',
            'debug'
        ],
        data: [
            'id',
            'slug',
            'email',
            'role'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                }
            }
        },
        permissions: true,
        async query(frame) {
            const model = await models.User.findOne(frame.data, frame.options);
            if (!model) {
                return Promise.reject(new errors.NotFoundError({
                    message: tpl(messages.userNotFound)
                }));
            }

            const json = model.toJSON();

            if (labs.isSet('NestPlayground')) {
                await attachFields(json);
            }

            return json;
        }
    },

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id',
            'include'
        ],
        validation: {
            options: {
                include: {
                    values: ALLOWED_INCLUDES
                },
                id: {
                    required: true
                }
            }
        },
        permissions: {
            unsafeAttrs: UNSAFE_ATTRS
        },
        async query(frame) {
            const userData = frame.data.users[0];
            const model = await models.User.edit(userData, frame.options);
            if (!model) {
                return Promise.reject(new errors.NotFoundError({
                    message: tpl(messages.userNotFound)
                }));
            }

            await writeStaffFields(model, userData);

            if (shouldInvalidateCacheAfterChange(model)) {
                frame.setHeader('X-Cache-Invalidate', '/*');
            }

            return model;
        }
    },

    destroy: {
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            return userService.destroyUser(frame.options).catch((err) => {
                return Promise.reject(new errors.NoPermissionError({
                    err: err
                }));
            });
        }
    },

    changePassword: {
        headers: {
            cacheInvalidate: false
        },
        validation: {
            docName: 'password',
            data: {
                newPassword: {required: true},
                ne2Password: {required: true},
                user_id: {required: true}
            }
        },
        permissions: {
            docName: 'user',
            method: 'edit',
            identifier(frame) {
                return frame.data.password[0].user_id;
            }
        },
        query(frame) {
            frame.options.skipSessionID = frame.original.session.id;
            return models.User.changePassword(frame.data.password[0], frame.options);
        }
    },

    transferOwnership: {
        headers: {
            cacheInvalidate: false
        },
        permissions(frame) {
            return models.Role.findOne({name: 'Owner'})
                .then((ownerRole) => {
                    return permissionsService.canThis(frame.options.context).assign.role(ownerRole);
                });
        },
        query(frame) {
            return models.User.transferOwnership(frame.data.owner[0], frame.options);
        }
    },

    readToken: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: permissionOnlySelf,
        query(frame) {
            const targetId = getTargetId(frame);
            return fetchOrCreatePersonalToken(targetId);
        }
    },

    regenerateToken: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: permissionOnlySelf,
        query(frame) {
            const targetId = getTargetId(frame);
            return fetchOrCreatePersonalToken(targetId).then((model) => {
                return models.ApiKey.refreshSecret(model.toJSON(), Object.assign({}, {id: model.id}));
            });
        }
    }
};
