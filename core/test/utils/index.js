var Promise = require('bluebird'),
    _ = require('lodash'),
    fs = require('fs-extra'),
    path = require('path'),
    Module = require('module'),
    os = require('os'),
    express = require('express'),
    debug = require('ghost-ignition').debug('test'),
    ObjectId = require('bson-objectid'),
    uuid = require('uuid'),
    KnexMigrator = require('knex-migrator'),
    ghost = require('../../server'),
    GhostServer = require('../../server/ghost-server'),
    api = require('../../server/api'),
    common = require('../../server/lib/common'),
    fixtureUtils = require('../../server/data/schema/fixtures/utils'),
    db = require('../../server/data/db'),
    schema = require('../../server/data/schema').tables,
    schemaTables = Object.keys(schema),
    models = require('../../server/models'),
    urlService = require('../../server/services/url'),
    routingService = require('../../server/services/routing'),
    settingsService = require('../../server/services/settings'),
    settingsCache = require('../../server/services/settings/cache'),
    imageLib = require('../../server/lib/image'),
    web = require('../../server/web'),
    permissions = require('../../server/services/permissions'),
    sequence = require('../../server/lib/promise/sequence'),
    themes = require('../../server/services/themes'),
    DataGenerator = require('./fixtures/data-generator'),
    configUtils = require('./configUtils'),
    filterData = require('./fixtures/filter-param'),
    APIUtils = require('./api'),
    mocks = require('./mocks'),
    config = require('../../server/config'),
    knexMigrator = new KnexMigrator(),
    fixtures,
    getFixtureOps,
    toDoList,
    originalRequireFn,
    postsInserted = 0,

    mockNotExistingModule,
    unmockNotExistingModule,
    teardown,
    setup,
    truncate,
    createUser,
    createPost,
    startGhost,

    initFixtures,
    initData,
    clearData,
    clearBruteData;

// Require additional assertions which help us keep our tests small and clear
require('./assertions');

/** TEST FIXTURES **/
fixtures = {
    insertPosts: function insertPosts(posts) {
        return Promise.map(posts, function (post) {
            return models.Post.add(post, module.exports.context.internal);
        });
    },

    insertPostsAndTags: function insertPostsAndTags() {
        return Promise.map(DataGenerator.forKnex.tags, function (tag) {
            return models.Tag.add(tag, module.exports.context.internal);
        }).then(function () {
            return Promise.map(_.cloneDeep(DataGenerator.forKnex.posts), function (post) {
                let postTagRelations = _.filter(DataGenerator.forKnex.posts_tags, {post_id: post.id});
                let postAuthorsRelations = _.filter(DataGenerator.forKnex.posts_authors, {post_id: post.id});

                postTagRelations = _.map(postTagRelations, function (postTagRelation) {
                    return _.find(DataGenerator.forKnex.tags, {id: postTagRelation.tag_id});
                });

                postAuthorsRelations = _.map(postAuthorsRelations, function (postAuthorsRelation) {
                    return _.find(DataGenerator.forKnex.users, {id: postAuthorsRelation.author_id});
                });

                post.tags = postTagRelations;
                post.authors = postAuthorsRelations;
                return models.Post.add(post, module.exports.context.internal);
            });
        });
    },

    insertMultiAuthorPosts: function insertMultiAuthorPosts(max) {
        let i, j, k = 0,
            posts = [];

        max = max || 50;

        // insert users of different roles
        return Promise.resolve(fixtures.createUsersWithRoles()).then(function () {
            return Promise.map(DataGenerator.forKnex.tags, function (tag) {
                return models.Tag.add(tag, module.exports.context.internal);
            });
        }).then(function () {
            return Promise.all([
                models.User.fetchAll(_.merge({columns: ['id']}, module.exports.context.internal)),
                models.Tag.fetchAll(_.merge({columns: ['id']}, module.exports.context.internal))
            ]);
        }).then(function (results) {
            let users = results[0],
                tags = results[1];

            tags = tags.toJSON();

            users = users.toJSON();
            users = _.map(users, 'id');

            // Let's insert posts with random authors
            for (i = 0; i < max; i += 1) {
                const author = users[i % users.length];
                posts.push(DataGenerator.forKnex.createGenericPost(k, null, null, author));
                k = k + 1;
            }

            return Promise.map(posts, function (post, index) {
                posts[index].authors = [{id: posts[index].author_id}];
                posts[index].tags = [tags[Math.floor(Math.random() * (tags.length - 1))]];
                return models.Post.add(posts[index], module.exports.context.internal);
            });
        });
    },

    insertExtraPosts: function insertExtraPosts(max) {
        var lang,
            status,
            posts = [],
            i, j, k = postsInserted;

        max = max || 50;

        for (i = 0; i < 2; i += 1) {
            lang = i % 2 ? 'en' : 'fr';
            posts.push(DataGenerator.forKnex.createGenericPost(k, null, lang));
            k = k + 1;

            for (j = 0; j < max; j += 1) {
                status = j % 2 ? 'draft' : 'published';
                posts.push(DataGenerator.forKnex.createGenericPost(k, status, lang));
                k = k + 1;
            }
        }

        // Keep track so we can run this function again safely
        postsInserted = k;

        return models.User.getOwnerUser(module.exports.context.internal)
            .then(function (ownerUser) {
                return Promise.map(posts, function (post, index) {
                    posts[index].authors = [ownerUser.toJSON()];
                    return models.Post.add(posts[index], module.exports.context.internal);
                });
            });
    },

    insertTags: function insertTags() {
        return Promise.map(DataGenerator.forKnex.tags, function (tag) {
            return models.Tag.add(tag, module.exports.context.internal);
        });
    },

    insertExtraTags: function insertExtraTags(max) {
        max = max || 50;
        var tags = [],
            tagName,
            i;

        for (i = 0; i < max; i += 1) {
            tagName = uuid.v4().split('-')[0];
            tags.push(DataGenerator.forKnex.createBasic({name: tagName, slug: tagName}));
        }

        return Promise.map(tags, function (tag, index) {
            return models.Tag.add(tags[index], module.exports.context.internal);
        });
    },

    insertExtraPostsTags: function insertExtraPostsTags(max) {
        max = max || 50;

        return Promise.all([
            models.Post.fetchAll(_.merge({columns: ['id'], withRelated: 'tags'}, module.exports.context.internal)),
            models.Tag.fetchAll(_.merge({columns: ['id', 'name']}, module.exports.context.internal))
        ]).then(function (results) {
            let posts = results[0].toJSON();
            let tags = results[1].toJSON();

            const injectionTagId = _.chain(tags)
                    .filter({name: 'injection'})
                    .map('id')
                    .value()[0];

            if (max > posts.length) {
                throw new Error('Trying to add more posts_tags than the number of posts.');
            }

            return Promise.map(posts.slice(0, max), function (post) {
                post.tags = post.tags ? post.tags : [];

                return models.Post.edit({
                    tags: post.tags.concat([_.find(DataGenerator.Content.tags, {id: injectionTagId})])
                }, _.merge({id: post.id}, module.exports.context.internal));
            });
        });
    },

    insertRoles: function insertRoles() {
        return Promise.map(DataGenerator.forKnex.roles, function (role) {
            return models.Role.add(role, module.exports.context.internal);
        });
    },

    initOwnerUser: function initOwnerUser() {
        var user = DataGenerator.Content.users[0];

        user = DataGenerator.forKnex.createBasic(user);
        user = _.extend({}, user, {status: 'inactive'});

        return Promise.map(DataGenerator.forKnex.roles, function (role) {
            return models.Role.add(role, module.exports.context.internal);
        }).then(function () {
            const userRolesRelation = _.cloneDeep(DataGenerator.forKnex.roles_users[0]);
            user.roles = _.filter(DataGenerator.forKnex.roles, {id: userRolesRelation.role_id});
            return models.User.add(user, module.exports.context.internal);
        });
    },

    insertOwnerUser: function insertOwnerUser() {
        const user = _.cloneDeep(DataGenerator.forKnex.users[0]);
        user.roles = [DataGenerator.forKnex.roles[3]];
        return models.User.add(user, module.exports.context.internal);
    },

    overrideOwnerUser: function overrideOwnerUser(slug) {
        return models.User.getOwnerUser(module.exports.context.internal)
            .then(function (ownerUser) {
                var user = DataGenerator.forKnex.createUser(DataGenerator.Content.users[0]);

                if (slug) {
                    user.slug = slug;
                }

                return models.User.edit(user, _.merge({id: ownerUser.id}, module.exports.context.internal));
            });
    },

    changeOwnerUserStatus: function changeOwnerUserStatus(options) {
        return models.User.getOwnerUser(module.exports.context.internal)
            .then(function (user) {
                return models.User.edit({status: options.status}, _.merge({id: user.id}, module.exports.context.internal));
            });
    },

    createUsersWithRoles: function createUsersWithRoles() {
        return Promise.map(DataGenerator.forKnex.roles, function (role) {
            return models.Role.add(role, module.exports.context.internal);
        }).then(function () {
            return Promise.map(_.cloneDeep(DataGenerator.forKnex.users), function (user) {
                let userRolesRelations = _.filter(DataGenerator.forKnex.roles_users, {user_id: user.id});

                userRolesRelations = _.map(userRolesRelations, function (userRolesRelation) {
                    return _.find(DataGenerator.forKnex.roles, {id: userRolesRelation.role_id});
                });

                user.roles = userRolesRelations;
                return models.User.add(user, module.exports.context.internal);
            });
        });
    },

    resetRoles: function resetRoles() {
        return Promise.map(_.cloneDeep(DataGenerator.forKnex.users), function (user) {
            let userRolesRelations = _.filter(DataGenerator.forKnex.roles_users, {user_id: user.id});

            userRolesRelations = _.map(userRolesRelations, function (userRolesRelation) {
                return _.find(DataGenerator.forKnex.roles, {id: userRolesRelation.role_id});
            });

            user.roles = userRolesRelations;
            return models.User.edit(user, _.merge({id: user.id}, module.exports.context.internal));
        });
    },

    createUsersWithoutOwner: function createUsersWithoutOwner() {
        var usersWithoutOwner =  _.cloneDeep(DataGenerator.forKnex.users.slice(1));

        return Promise.map(usersWithoutOwner, function (user) {
            let userRolesRelations = _.filter(DataGenerator.forKnex.roles_users, {user_id: user.id});

            userRolesRelations = _.map(userRolesRelations, function (userRolesRelation) {
                return _.find(DataGenerator.forKnex.roles, {id: userRolesRelation.role_id});
            });

            user.roles = userRolesRelations;
            return models.User.add(user, module.exports.context.internal);
        });
    },

    createExtraUsers: function createExtraUsers() {
        // grab 3 more users
        var extraUsers =  _.cloneDeep(DataGenerator.Content.users.slice(2, 6));
        extraUsers = _.map(extraUsers, function (user) {
            return DataGenerator.forKnex.createUser(_.extend({}, user, {
                id: ObjectId.generate(),
                email: 'a' + user.email,
                slug: 'a' + user.slug
            }));
        });

        const roles = {};
        roles[extraUsers[0].id] = DataGenerator.Content.roles[0];
        roles[extraUsers[1].id] = DataGenerator.Content.roles[1];
        roles[extraUsers[2].id] = DataGenerator.Content.roles[2];
        roles[extraUsers[3].id] = DataGenerator.Content.roles[4];

        // @TODO: remove when overhauling test env
        // tests need access to the extra created users (especially to the created id)
        // replacement for admin2, editor2 etc
        DataGenerator.Content.extraUsers = extraUsers;

        return Promise.map(extraUsers, function (user) {
            user.roles =  roles[user.id];
            return models.User.add(user, module.exports.context.internal);
        });
    },

    insertOneUser: function insertOneUser(options) {
        options = options || {};

        return models.User.add({
            name: options.name,
            email: options.email,
            slug: options.slug,
            status: options.status
        }, module.exports.context.internal);
    },

    // Creates a client, and access and refresh tokens for user with index or 2 by default
    createTokensForUser: function createTokensForUser(index) {
        return Promise.map(DataGenerator.forKnex.clients, function (client) {
            return models.Client.add(client, module.exports.context.internal);
        }).then(function () {
            return models.Accesstoken.add(DataGenerator.forKnex.createToken({
                user_id: DataGenerator.Content.users[index || 2].id
            }), module.exports.context.internal);
        }).then(function () {
            return models.Refreshtoken.add(DataGenerator.forKnex.createToken({
                user_id: DataGenerator.Content.users[index || 2].id
            }), module.exports.context.internal);
        });
    },

    insertOne: function insertOne(modelName, tableName, fn, index) {
        const obj = DataGenerator.forKnex[fn](DataGenerator.Content[tableName][index || 0]);
        return models[modelName].add(obj, module.exports.context.internal);
    },

    getImportFixturePath: function (filename) {
        return path.resolve(__dirname + '/fixtures/import/' + filename);
    },

    getExportFixturePath: function (filename) {
        var relativePath = '/fixtures/export/';
        return path.resolve(__dirname + relativePath + filename + '.json');
    },

    loadExportFixture: function loadExportFixture(filename) {
        var filePath = this.getExportFixturePath(filename);

        return fs.readFile(filePath).then(function (fileContents) {
            var data;

            // Parse the json data
            try {
                data = JSON.parse(fileContents);
            } catch (e) {
                return new Error('Failed to parse the file');
            }

            return data;
        });
    },

    permissionsFor: function permissionsFor(obj) {
        var permsToInsert =  _.cloneDeep(fixtureUtils.findModelFixtures('Permission', {object_type: obj}).entries),
            permsRolesToInsert = fixtureUtils.findPermissionRelationsForObject(obj).entries,
            actions = [],
            permissionsRoles = {},
            roles = {
                Administrator: DataGenerator.Content.roles[0].id,
                Editor: DataGenerator.Content.roles[1].id,
                Author: DataGenerator.Content.roles[2].id,
                Owner: DataGenerator.Content.roles[3].id,
                Contributor: DataGenerator.Content.roles[4].id,
                'Admin Integration': DataGenerator.Content.roles[5].id
            };

        // CASE: if empty db will throw SQLITE_MISUSE, hard to debug
        if (_.isEmpty(permsToInsert)) {
            return Promise.reject(new Error('no permission found:' + obj));
        }

        permsToInsert = _.map(permsToInsert, function (perms) {
            perms.id = ObjectId.generate();

            actions.push({type: perms.action_type, permissionId: perms.id});
            return DataGenerator.forKnex.createBasic(perms);
        });

        _.each(permsRolesToInsert, function (perms, role) {
            if (perms[obj]) {
                if (perms[obj] === 'all') {
                    _.each(actions, function (action) {
                        if (!permissionsRoles[action.permissionId]) {
                            permissionsRoles[action.permissionId] = [];
                        }

                        permissionsRoles[action.permissionId].push(_.find(DataGenerator.Content.roles, {id: roles[role]}));
                    });
                } else {
                    _.each(perms[obj], function (action) {
                        if (!permissionsRoles[_.find(actions, {type: action}).permissionId]) {
                            permissionsRoles[_.find(actions, {type: action}).permissionId] = [];
                        }

                        permissionsRoles[_.find(actions, {type: action}).permissionId].push(_.find(DataGenerator.Content.roles, {id: roles[role]}));
                    });
                }
            }
        });

        return Promise.map(permsToInsert, function (perm) {
            if (!_.isEmpty(permissionsRoles)) {
                perm.roles = permissionsRoles[perm.id];
            }

            return models.Permission.add(perm, module.exports.context.internal);
        });
    },

    insertClients: function insertClients() {
        return Promise.map(DataGenerator.forKnex.clients, function (client) {
            return models.Client.add(client, module.exports.context.internal);
        });
    },

    insertClientWithTrustedDomain: function insertClientWithTrustedDomain() {
        const client = DataGenerator.forKnex.createClient({slug: 'ghost-test'});

        return models.Client.add(client, module.exports.context.internal)
            .then(function () {
                return models.ClientTrustedDomain.add(DataGenerator.forKnex.createTrustedDomain({
                    client_id: client.id
                }), module.exports.context.internal);
            });
    },

    insertAccessToken: function insertAccessToken(override) {
        return models.Accesstoken.insert(DataGenerator.forKnex.createToken(override), module.exports.context.internal);
    },

    insertInvites: function insertInvites() {
        return Promise.map(DataGenerator.forKnex.invites, function (invite) {
            return models.Invite.add(invite, module.exports.context.internal);
        });
    },

    insertWebhooks: function insertWebhooks() {
        return Promise.map(DataGenerator.forKnex.webhooks, function (webhook) {
            return models.Webhook.add(webhook, module.exports.context.internal);
        });
    },

    insertIntegrations: function insertIntegrations() {
        return Promise.map(DataGenerator.forKnex.integrations, function (integration) {
            return models.Integration.add(integration, module.exports.context.internal);
        });
    },

    insertApiKeys: function insertApiKeys() {
        return Promise.map(DataGenerator.forKnex.api_keys, function (api_key) {
            return models.ApiKey.add(api_key, module.exports.context.internal);
        });
    },
};

/** Test Utility Functions **/
initData = function initData() {
    return knexMigrator.init()
        .then(function () {
            common.events.emit('db.ready');

            let timeout;

            return new Promise(function (resolve) {
                (function retry() {
                    clearTimeout(timeout);

                    if (urlService.hasFinished()) {
                        return resolve();
                    }

                    timeout = setTimeout(retry, 50);
                })();
            });
        });
};

clearBruteData = function clearBruteData() {
    return db.knex('brute').truncate();
};

truncate = function truncate(tableName) {
    if (config.get('database:client') === 'sqlite3') {
        return db.knex(tableName).truncate();
    }

    return db.knex.raw('SET FOREIGN_KEY_CHECKS=0;')
        .then(function () {
            return db.knex(tableName).truncate();
        })
        .then(function () {
            return db.knex.raw('SET FOREIGN_KEY_CHECKS=1;');
        });
};

// we must always try to delete all tables
clearData = function clearData() {
    debug('Database reset');
    return knexMigrator.reset({force: true})
        .then(function () {
            urlService.softReset();
        });
};

toDoList = {
    app: function insertApp() {
        return fixtures.insertOne('App', 'apps', 'createApp');
    },
    app_field: function insertAppField() {
        // TODO: use the actual app ID to create the field
        return fixtures.insertOne('App', 'apps', 'createApp').then(function () {
            return fixtures.insertOne('AppField', 'app_fields', 'createAppField');
        });
    },
    app_setting: function insertAppSetting() {
        // TODO: use the actual app ID to create the field
        return fixtures.insertOne('App', 'apps', 'createApp').then(function () {
            return fixtures.insertOne('AppSetting', 'app_settings', 'createAppSetting');
        });
    },
    permission: function insertPermission() {
        return fixtures.insertOne('Permission', 'permissions', 'createPermission');
    },
    role: function insertRole() {
        return fixtures.insertOne('Role', 'roles', 'createRole');
    },
    roles: function insertRoles() {
        return fixtures.insertRoles();
    },
    tag: function insertTag() {
        return fixtures.insertOne('Tag', 'tags', 'createTag');
    },
    subscriber: function insertSubscriber() {
        return fixtures.insertOne('Subscriber', 'subscribers', 'createSubscriber');
    },
    posts: function insertPostsAndTags() {
        return fixtures.insertPostsAndTags();
    },
    'posts:mu': function insertMultiAuthorPosts() {
        return fixtures.insertMultiAuthorPosts();
    },
    tags: function insertTags() {
        return fixtures.insertTags();
    },
    'tags:extra': function insertExtraTags() {
        return fixtures.insertExtraTags();
    },
    apps: function insertApps() {
        return fixtures.insertApps();
    },
    settings: function populateSettings() {
        settingsCache.shutdown();
        return settingsService.init();
    },
    'users:roles': function createUsersWithRoles() {
        return fixtures.createUsersWithRoles();
    },
    'users:no-owner': function createUsersWithoutOwner() {
        return fixtures.createUsersWithoutOwner();
    },
    'users:extra': function createExtraUsers() {
        return fixtures.createExtraUsers();
    },
    'user-token': function createTokensForUser(index) {
        return fixtures.createTokensForUser(index);
    },
    owner: function insertOwnerUser() {
        return fixtures.insertOwnerUser();
    },
    'owner:pre': function initOwnerUser() {
        return fixtures.initOwnerUser();
    },
    'owner:post': function overrideOwnerUser() {
        return fixtures.overrideOwnerUser();
    },
    'perms:init': function initPermissions() {
        return permissions.init();
    },
    perms: function permissionsFor(obj) {
        return fixtures.permissionsFor(obj);
    },
    clients: function insertClients() {
        return fixtures.insertClients();
    },
    'client:trusted-domain': function insertClients() {
        return fixtures.insertClientWithTrustedDomain();
    },
    filter: function createFilterParamFixtures() {
        return filterData(DataGenerator);
    },
    invites: function insertInvites() {
        return fixtures.insertInvites();
    },
    themes: function loadThemes() {
        return themes.loadAll();
    },
    webhooks: function insertWebhooks() {
        return fixtures.insertWebhooks();
    },
    integrations: function insertIntegrations() {
        return fixtures.insertIntegrations();
    },
    api_keys: function insertApiKeys() {
        return fixtures.insertApiKeys();
    }
};

/**
 * ## getFixtureOps
 *
 * Takes the arguments from a setup function and turns them into an array of promises to fullfil
 *
 * This is effectively a list of instructions with regard to which fixtures should be setup for this test.
 *  * `default` - a special option which will cause the full suite of normal fixtures to be initialised
 *  * `perms:init` - initialise the permissions object after having added permissions
 *  * `perms:obj` - initialise permissions for a particular object type
 *  * `users:roles` - create a full suite of users, one per role
 * @param {Object} toDos
 */
getFixtureOps = function getFixtureOps(toDos) {
    // default = default fixtures, if it isn't present, init with tables only
    var tablesOnly = !toDos.default,
        fixtureOps = [];

    // Database initialisation
    if (toDos.init || toDos.default) {
        fixtureOps.push(function initDB() {
            // skip adding all fixtures!
            if (tablesOnly) {
                return knexMigrator.init({skip: 2});
            }

            return knexMigrator.init();
        });

        delete toDos.default;
        delete toDos.init;
    }

    // Go through our list of things to do, and add them to an array
    _.each(toDos, function (value, toDo) {
        var tmp;

        if ((toDo !== 'perms:init' && toDo.indexOf('perms:') !== -1) || toDo.indexOf('user-token:') !== -1) {
            tmp = toDo.split(':');

            fixtureOps.push(function addCustomFixture() {
                return toDoList[tmp[0]](tmp[1]);
            });
        } else {
            if (!toDoList[toDo]) {
                throw new Error('setup todo does not exist - spell mistake?');
            }

            fixtureOps.push(toDoList[toDo]);
        }
    });

    return fixtureOps;
};

// ## Test Setup and Teardown

initFixtures = function initFixtures() {
    var options = _.merge({init: true}, _.transform(arguments, function (result, val) {
            result[val] = true;
        })),
        fixtureOps = getFixtureOps(options);

    return sequence(fixtureOps);
};

/**
 * ## Setup Integration Tests
 * Setup takes a list of arguments like: 'default', 'tag', 'perms:tag', 'perms:init'
 * Setup does 'init' (DB) by default
 * @returns {Function}
 */
setup = function setup() {
    /*eslint no-invalid-this: "off"*/
    const self = this,
        args = arguments;

    return function setup() {
        models.init();
        return initFixtures.apply(self, args);
    };
};

createUser = function createUser(options) {
    var user = options.user,
        role = options.role;

    return models.Role.fetchAll(module.exports.context.internal)
        .then(function (roles) {
            roles = roles.toJSON();
            user.roles = [_.find(roles, {name: role})];

            return models.User.add(user, module.exports.context.internal)
                .then(function () {
                    return user;
                });
        });
};

createPost = function createPost(options) {
    var post = DataGenerator.forKnex.createPost(options.post);

    if (options.author) {
        post.author_id = options.author.id;
    }

    post.authors = [{id: post.author_id}];
    return models.Post.add(post, module.exports.context.internal);
};

/**
 * Has to run in a transaction for MySQL, otherwise the foreign key check does not work.
 * Sqlite3 has no truncate command.
 */
teardown = function teardown() {
    debug('Database teardown');
    urlService.softReset();

    var tables = schemaTables.concat(['migrations']);

    if (config.get('database:client') === 'sqlite3') {
        return Promise
            .mapSeries(tables, function createTable(table) {
                return db.knex.raw('DELETE FROM ' + table + ';');
            })
            .catch(function (err) {
                // CASE: table does not exist
                if (err.errno === 1) {
                    return Promise.resolve();
                }

                throw err;
            });
    }

    return db.knex.transaction(function (trx) {
        return db.knex.raw('SET FOREIGN_KEY_CHECKS=0;').transacting(trx)
            .then(function () {
                return Promise
                    .each(tables, function createTable(table) {
                        return db.knex.raw('TRUNCATE ' + table + ';').transacting(trx);
                    });
            })
            .then(function () {
                return db.knex.raw('SET FOREIGN_KEY_CHECKS=1;').transacting(trx);
            })
            .catch(function (err) {
                // CASE: table does not exist
                if (err.errno === 1146) {
                    return Promise.resolve();
                }

                throw err;
            });
    });
};

/**
 * offer helper functions for mocking
 * we start with a small function set to mock non existent modules
 */
originalRequireFn = Module.prototype.require;
mockNotExistingModule = function mockNotExistingModule(modulePath, module, error = false) {
    Module.prototype.require = function (path) {
        if (path.match(modulePath)) {
            if (error) {
                throw module;
            }

            return module;
        }

        return originalRequireFn.apply(this, arguments);
    };
};

unmockNotExistingModule = function unmockNotExistingModule() {
    Module.prototype.require = originalRequireFn;
};

var ghostServer;

/**
 * 1. reset & init db
 * 2. start the server once
 *
 * @TODO: tidy up the tmp folders
 */
startGhost = function startGhost(options) {
    options = _.merge({
        redirectsFile: true,
        forceStart: false,
        copyThemes: true,
        copySettings: true,
        contentFolder: path.join(os.tmpdir(), uuid.v1(), 'ghost-test'),
        subdir: false
    }, options);

    var contentFolderForTests = options.contentFolder,
        parentApp;

    /**
     * We never use the root content folder for testing!
     * We use a tmp folder.
     */
    configUtils.set('paths:contentPath', contentFolderForTests);

    fs.ensureDirSync(contentFolderForTests);
    fs.ensureDirSync(path.join(contentFolderForTests, 'data'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'themes'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'images'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'logs'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'adapters'));
    fs.ensureDirSync(path.join(contentFolderForTests, 'settings'));

    if (options.copyThemes) {
        // Copy all themes into the new test content folder. Default active theme is always casper. If you want to use a different theme, you have to set the active theme (e.g. stub)
        fs.copySync(path.join(__dirname, 'fixtures', 'themes'), path.join(contentFolderForTests, 'themes'));
    }

    if (options.redirectsFile) {
        fs.copySync(path.join(__dirname, 'fixtures', 'data', 'redirects.json'), path.join(contentFolderForTests, 'data', 'redirects.json'));
    }

    if (options.copySettings) {
        fs.copySync(path.join(__dirname, 'fixtures', 'settings', 'routes.yaml'), path.join(contentFolderForTests, 'settings', 'routes.yaml'));
    }

    // truncate database and re-run fixtures
    // we have to ensure that some components in Ghost are reloaded
    if (ghostServer && ghostServer.httpServer && !options.forceStart) {
        return teardown()
            .then(function () {
                return knexMigrator.init({only: 2});
            })
            .then(function () {
                settingsCache.shutdown();
                return settingsService.init();
            })
            .then(function () {
                return themes.init();
            })
            .then(function () {
                urlService.softReset();
                common.events.emit('db.ready');

                let timeout;

                return new Promise(function (resolve) {
                    (function retry() {
                        clearTimeout(timeout);

                        if (urlService.hasFinished()) {
                            return resolve();
                        }

                        timeout = setTimeout(retry, 50);
                    })();
                });
            })
            .then(function () {
                web.shared.middlewares.customRedirects.reload();

                common.events.emit('server.start');

                /**
                 * @TODO: this is dirty, but makes routing testing a lot easier for now, because the routing test
                 * has no easy way to access existing resource id's, which are added from the Ghost fixtures.
                 * I can do `testUtils.existingData.roles[0].id`.
                 */
                module.exports.existingData = {};
                return models.Role.fetchAll({columns: ['id']})
                    .then((roles) => {
                        module.exports.existingData.roles = roles.toJSON();

                        return models.Client.fetchAll({columns: ['id', 'secret']});
                    })
                    .then((clients) => {
                        module.exports.existingData.clients = clients.toJSON();

                        return models.User.fetchAll({columns: ['id']});
                    })
                    .then((users) => {
                        module.exports.existingData.users = users.toJSON();
                    })
                    .return(ghostServer);
            });
    }

    return knexMigrator.reset({force: true})
        .then(function () {
            if (ghostServer && ghostServer.httpServer) {
                return ghostServer.stop();
            }
        })
        .then(function initialiseDatabase() {
            return knexMigrator.init();
        })
        .then(function initializeGhost() {
            urlService.resetGenerators();

            return ghost();
        })
        .then(function startGhost(_ghostServer) {
            ghostServer = _ghostServer;

            if (options.subdir) {
                parentApp = express();
                parentApp.use(urlService.utils.getSubdir(), ghostServer.rootApp);
                return ghostServer.start(parentApp);
            }

            return ghostServer.start();
        })
        .then(function () {
            let timeout;

            GhostServer.announceServerStart();

            return new Promise(function (resolve) {
                (function retry() {
                    clearTimeout(timeout);

                    if (urlService.hasFinished()) {
                        return resolve();
                    }

                    timeout = setTimeout(retry, 50);
                })();
            });
        })
        .then(function returnGhost() {
            /**
             * @TODO: this is dirty, but makes routing testing a lot easier for now, because the routing test
             * has no easy way to access existing resource id's, which are added from the Ghost fixtures.
             * I can do `testUtils.existingData.roles[0].id`.
             */
            module.exports.existingData = {};
            return models.Role.fetchAll({columns: ['id']})
                .then((roles) => {
                    module.exports.existingData.roles = roles.toJSON();

                    return models.Client.fetchAll({columns: ['id', 'secret']});
                })
                .then((clients) => {
                    module.exports.existingData.clients = clients.toJSON();

                    return models.User.fetchAll({columns: ['id']});
                })
                .then((users) => {
                    module.exports.existingData.users = users.toJSON();
                })
                .return(ghostServer);
        });
};

module.exports = {
    startGhost: startGhost,

    integrationTesting: {
        overrideGhostConfig: function overrideGhostConfig(configUtils) {
            configUtils.set('paths:contentPath', path.join(__dirname, 'fixtures'));
            configUtils.set('times:getImageSizeTimeoutInMS', 1);
        },

        defaultMocks: function defaultMocks(sandbox, options) {
            options = options || {};

            configUtils.set('paths:contentPath', path.join(__dirname, 'fixtures'));

            const cacheStub = sandbox.stub(settingsCache, 'get');

            cacheStub.withArgs('active_theme').returns(options.theme || 'casper');
            cacheStub.withArgs('active_timezone').returns('Etc/UTC');
            cacheStub.withArgs('permalinks').returns('/:slug/');
            cacheStub.withArgs('labs').returns({publicAPI: true});

            sandbox.stub(api.clients, 'read').returns(Promise.resolve({
                clients: [
                    {slug: 'ghost-frontend', secret: 'a1bcde23cfe5', status: 'enabled'}
                ]
            }));

            sandbox.stub(imageLib.imageSize, 'getImageSizeFromUrl').resolves();
        },

        initGhost: function () {
            models.init();
            return themes.init();
        },

        routing: {
            reset: function () {
                routingService.registry.resetAll();
            }
        },

        urlService: {
            waitTillFinished: function (options = {dbIsReady: false}) {
                let timeout;

                if (!options.dbIsReady) {
                    common.events.emit('db.ready');
                }

                return new Promise(function (resolve) {
                    (function retry() {
                        clearTimeout(timeout);

                        if (urlService.hasFinished()) {
                            return resolve();
                        }

                        timeout = setTimeout(retry, 50);
                    })();
                });
            },

            init: function () {
                const routes = settingsService.get('routes');

                const collectionRouter = new routingService.CollectionRouter('/', routes.collections['/']);
                const tagRouter = new routingService.TaxonomyRouter('tag', routes.taxonomies.tag);
                const authorRouter = new routingService.TaxonomyRouter('author', routes.taxonomies.author);

                common.events.emit('db.ready');

                return this.waitTillFinished();
            },

            reset: function () {
                urlService.softReset();
            },

            resetGenerators: function () {
                urlService.resetGenerators();
            }
        },
    },
    teardown: teardown,
    truncate: truncate,
    setup: setup,
    createUser: createUser,
    createPost: createPost,

    mockNotExistingModule: mockNotExistingModule,
    unmockNotExistingModule: unmockNotExistingModule,

    /**
     * renderObject:    res.render(view, dbResponse)
     * templateOptions: hbs.updateTemplateOptions(...)
     */
    createHbsResponse: function createHbsResponse(options) {
        var renderObject = options.renderObject || {},
            templateOptions = options.templateOptions,
            locals = options.locals || {},
            hbsStructure = {
                data: {
                    blog: {},
                    config: {},
                    labs: {},
                    root: {
                        _locals: {}
                    }
                }
            };

        _.merge(hbsStructure.data, templateOptions);
        _.merge(hbsStructure.data.root, renderObject);
        _.merge(hbsStructure.data.root, locals);
        hbsStructure.data.root._locals = locals;

        return hbsStructure;
    },

    initFixtures: initFixtures,
    initData: initData,
    clearData: clearData,
    clearBruteData: clearBruteData,

    mocks: mocks,

    fixtures: fixtures,

    DataGenerator: DataGenerator,
    filterData: filterData,
    API: APIUtils({getFixtureOps: getFixtureOps}),

    // Helpers to make it easier to write tests which are easy to read
    context: {
        internal: {context: {internal: true}},
        external: {context: {external: true}},
        owner: {context: {user: DataGenerator.Content.users[0].id}},
        admin: {context: {user: DataGenerator.Content.users[1].id}},
        editor: {context: {user: DataGenerator.Content.users[2].id}},
        author: {context: {user: DataGenerator.Content.users[3].id}},
        contributor: {context: {user: DataGenerator.Content.users[7].id}},
        admin_api_key: {context: {api_key: DataGenerator.Content.api_keys[0].id}},
        content_api_key: {context: {api_key: DataGenerator.Content.api_keys[1].id}}
    },
    permissions: {
        owner: {user: {roles: [DataGenerator.Content.roles[3]]}},
        admin: {user: {roles: [DataGenerator.Content.roles[0]]}},
        editor: {user: {roles: [DataGenerator.Content.roles[1]]}},
        author: {user: {roles: [DataGenerator.Content.roles[2]]}},
        contributor: {user: {roles: [DataGenerator.Content.roles[4]]}},
    },
    users: {
        ids: {
            owner: DataGenerator.Content.users[0].id,
            admin: DataGenerator.Content.users[1].id,
            editor: DataGenerator.Content.users[2].id,
            author: DataGenerator.Content.users[3].id,
            admin2: DataGenerator.Content.users[6].id,
            editor2: DataGenerator.Content.users[4].id,
            author2: DataGenerator.Content.users[5].id,
            contributor: DataGenerator.Content.users[7].id,
            contributor2: DataGenerator.Content.users[8].id
        }
    },
    roles: {
        ids: {
            owner: DataGenerator.Content.roles[3].id,
            admin: DataGenerator.Content.roles[0].id,
            editor: DataGenerator.Content.roles[1].id,
            author: DataGenerator.Content.roles[2].id,
            contributor: DataGenerator.Content.roles[4].id
        }
    },
    cacheRules: {
        public: 'public, max-age=0',
        hour: 'public, max-age=' + 3600,
        day: 'public, max-age=' + 86400,
        year: 'public, max-age=' + 31536000,
        private: 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    }
};
