var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    models = require('../../../server/models'),
    permissions = require('../../../server/permissions'),
    effective = require('../../../server/permissions/effective'),

    sandbox = sinon.sandbox.create();

describe('Permissions', function () {
    var fakePermissions = [],
        findPostSpy,
        findTagSpy;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        sandbox.stub(models.Permission, 'findAll', function () {
            return Promise.resolve(models.Permissions.forge(fakePermissions));
        });

        findPostSpy = sandbox.stub(models.Post, 'findOne', function () {
            return Promise.resolve(models.Post.forge(testUtils.DataGenerator.Content.posts[0]));
        });

        findTagSpy = sandbox.stub(models.Tag, 'findOne', function () {
            return Promise.resolve({});
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    /**
     * Default test actionMap looks like this:
     * {
     *   browse: [ 'post' ],
     *   edit: [ 'post', 'tag', 'user', 'page' ],
     *   add: [ 'post', 'user', 'page' ],
     *   destroy: [ 'post', 'user' ]
     * }
     *
     * @param {object} options
     * @return {Array|*}
     */
    function loadFakePermissions(options) {
        options = options || {};

        var fixturePermissions = testUtils.DataGenerator.Content.permissions,
            extraPerm = {
                name: 'test',
                action_type: 'edit',
                object_type: 'post'
            };

        if (options.extra) {
            fixturePermissions.push(extraPerm);
        }

        return _.map(fixturePermissions, function (testPerm) {
            return testUtils.DataGenerator.forKnex.createPermission(testPerm);
        });
    }

    describe('No init (no action map)', function () {
        it('throws an error without init', function () {
            permissions.canThis.should.throw(/No actions map found/);
        });
    });

    describe('Init (build actions map)', function () {
        it('can load an actions map from existing permissions', function (done) {
            fakePermissions = loadFakePermissions();

            permissions.init().then(function (actionsMap) {
                should.exist(actionsMap);

                _.keys(actionsMap).should.eql(['browse', 'edit', 'add', 'destroy']);

                actionsMap.browse.should.eql(['post']);
                actionsMap.edit.should.eql(['post', 'tag', 'user', 'page']);
                actionsMap.add.should.eql(['post', 'user', 'page']);
                actionsMap.destroy.should.eql(['post', 'user']);

                actionsMap.should.equal(permissions.actionsMap);

                done();
            }).catch(done);
        });

        it('can load an actions map from existing permissions, and deduplicate', function (done) {
            fakePermissions = loadFakePermissions({extra: true});

            permissions.init().then(function (actionsMap) {
                should.exist(actionsMap);

                _.keys(actionsMap).should.eql(['browse', 'edit', 'add', 'destroy']);

                actionsMap.browse.should.eql(['post']);
                actionsMap.edit.should.eql(['post', 'tag', 'user', 'page']);
                actionsMap.add.should.eql(['post', 'user', 'page']);
                actionsMap.destroy.should.eql(['post', 'user']);

                actionsMap.should.equal(permissions.actionsMap);

                done();
            }).catch(done);
        });
    });

    describe('CanThis', function () {
        beforeEach(function () {
            fakePermissions = loadFakePermissions();

            return permissions.init();
        });

        it('canThisResult gets build properly', function () {
            var canThisResult = permissions.canThis();

            canThisResult.browse.should.be.an.Object();
            canThisResult.browse.post.should.be.a.Function();

            canThisResult.edit.should.be.an.Object();
            canThisResult.edit.post.should.be.a.Function();
            canThisResult.edit.tag.should.be.a.Function();
            canThisResult.edit.user.should.be.a.Function();
            canThisResult.edit.page.should.be.a.Function();

            canThisResult.add.should.be.an.Object();
            canThisResult.add.post.should.be.a.Function();
            canThisResult.add.user.should.be.a.Function();
            canThisResult.add.page.should.be.a.Function();

            canThisResult.destroy.should.be.an.Object();
            canThisResult.destroy.post.should.be.a.Function();
            canThisResult.destroy.user.should.be.a.Function();
        });

        describe('Non user/app permissions', function () {
            // TODO change to using fake models in tests!
            // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
            // It can depend on bookshelf, but should NOT use hard coded model knowledge.
            describe('with permissible calls (post model)', function () {
                it('No context: does not allow edit post (no model)', function (done) {
                    permissions
                        .canThis() // no context
                        .edit
                        .post() // post id
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(0);
                            done();
                        });
                });

                it('No context: does not allow edit post (model syntax)', function (done) {
                    permissions
                        .canThis() // no context
                        .edit
                        .post({id: 1}) // post id in model syntax
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(1);
                            findPostSpy.firstCall.args[0].should.eql({id: 1, status: 'all'});
                            done();
                        });
                });

                it('No context: does not allow edit post (model ID syntax)', function (done) {
                    permissions
                        .canThis({}) // no context
                        .edit
                        .post(1) // post id using number syntax
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(1);
                            findPostSpy.firstCall.args[0].should.eql({id: 1, status: 'all'});
                            done();
                        });
                });

                it('Internal context: instantly grants permissions', function (done) {
                    permissions
                        .canThis({internal: true}) // internal context
                        .edit
                        .post({id: 1}) // post id
                        .then(function () {
                            // We don't get this far, permissions are instantly granted for internal
                            findPostSpy.callCount.should.eql(0);
                            done();
                        })
                        .catch(function () {
                            done(new Error('Should allow editing post with { internal: true }'));
                        });
                });

                it('External context: does not grant permissions', function (done) {
                    permissions
                        .canThis({external: true}) // internal context
                        .edit
                        .post({id: 1}) // post id
                        .then(function () {
                            done(new Error('was able to edit post without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findPostSpy.callCount.should.eql(1);
                            findPostSpy.firstCall.args[0].should.eql({id: 1, status: 'all'});
                            done();
                        });
                });
            });

            describe('without permissible (tag model)', function () {
                it('No context: does not allow edit tag (model syntax)', function (done) {
                    permissions
                        .canThis() // no context
                        .edit
                        .tag({id: 1}) // tag id in model syntax
                        .then(function () {
                            done(new Error('was able to edit tag without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            // We don't look up tags
                            findTagSpy.callCount.should.eql(0);
                            done();
                        });
                });

                it('Internal context: instantly grants permissions', function (done) {
                    permissions
                        .canThis({internal: true}) // internal context
                        .edit
                        .tag({id: 1}) // tag id
                        .then(function () {
                            // We don't look up tags
                            findTagSpy.callCount.should.eql(0);
                            done();
                        })
                        .catch(function () {
                            done(new Error('Should allow editing post with { internal: true }'));
                        });
                });

                it('External context: does not grant permissions', function (done) {
                    permissions
                        .canThis({external: true}) // external context
                        .edit
                        .tag({id: 1}) // tag id
                        .then(function () {
                            done(new Error('was able to edit tag without permission'));
                        })
                        .catch(function (err) {
                            err.errorType.should.eql('NoPermissionError');

                            findTagSpy.callCount.should.eql(0);
                            done();
                        });
                });
            });
        });

        describe('User-based permissions', function () {
            // TODO change to using fake models in tests!
            // Permissions need to be NOT fundamentally baked into Ghost, but a separate module, at some point
            // It can depend on bookshelf, but should NOT use hard coded model knowledge.
            // We use the tag model here because it doesn't have permissible, once that changes, these tests must also change
            it('No permissions: cannot edit tag (no permissible function on model)', function (done) {
                var effectiveUserStub = sandbox.stub(effective, 'user', function () {
                    // Fake the response from effective.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: [],
                        roles: undefined
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function () {
                        done(new Error('was able to edit tag without permission'));
                    })
                    .catch(function (err) {
                        effectiveUserStub.callCount.should.eql(1);
                        err.errorType.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('With permissions: can edit specific tag (no permissible function on model)', function (done) {
                var effectiveUserStub = sandbox.stub(effective, 'user', function () {
                    // Fake the response from effective.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: undefined
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function (res) {
                        effectiveUserStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });

            it('With permissions: can edit non-specific tag (no permissible function on model)', function (done) {
                var effectiveUserStub = sandbox.stub(effective, 'user', function () {
                    // Fake the response from effective.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: undefined
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag() // tag id in model syntax
                    .then(function (res) {
                        effectiveUserStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });

            it('Specific permissions: can edit correct specific tag (no permissible function on model)', function (done) {
                var effectiveUserStub = sandbox.stub(effective, 'user', function () {
                    // Fake the response from effective.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge([
                            {
                                id: 'abc123',
                                name: 'test',
                                action_type: 'edit',
                                object_type: 'tag',
                                object_id: 1
                            }
                        ]).models,
                        roles: undefined
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function (res) {
                        effectiveUserStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });

            it('Specific permissions: cannot edit incorrect specific tag (no permissible function on model)', function (done) {
                var effectiveUserStub = sandbox.stub(effective, 'user', function () {
                    // Fake the response from effective.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge([
                            {
                                id: 'abc123',
                                name: 'test',
                                action_type: 'edit',
                                object_type: 'tag',
                                object_id: 1
                            }
                        ]).models,
                        roles: undefined
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 10}) // tag id in model syntax
                    .then(function () {
                        done(new Error('was able to edit tag without permission'));
                    })
                    .catch(function (err) {
                        effectiveUserStub.callCount.should.eql(1);
                        err.errorType.should.eql('NoPermissionError');
                        done();
                    });
            });

            // @TODO fix this case - it makes no sense?!
            it('Specific permissions: CAN edit non-specific tag (no permissible function on model) @TODO fix this', function (done) {
                var effectiveUserStub = sandbox.stub(effective, 'user', function () {
                    // Fake the response from effective.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge([
                            {
                                id: 'abc123',
                                name: 'test',
                                action_type: 'edit',
                                object_type: 'tag',
                                object_id: 1
                            }
                        ]).models,
                        roles: undefined
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag() // tag id in model syntax
                    .then(function (res) {
                        effectiveUserStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });

            it('With owner role: can edit tag (no permissible function on model)', function (done) {
                var effectiveUserStub = sandbox.stub(effective, 'user', function () {
                    // Fake the response from effective.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: [],
                        // This should be JSON, so no need to run it through the model layer. 3 === owner
                        roles: [testUtils.DataGenerator.Content.roles[3]]
                    });
                });

                permissions
                    .canThis({user: {}}) // user context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function (res) {
                        effectiveUserStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });
        });

        describe('App-based permissions (requires user as well)', function () {
            // @TODO: revisit this - do we really need to have USER permissions AND app permissions?
            it('No permissions: cannot edit tag with app only (no permissible function on model)', function (done) {
                var effectiveAppStub = sandbox.stub(effective, 'app', function () {
                    // Fake the response from effective.app, which contains an empty array for this case
                    return Promise.resolve([]);
                });

                permissions
                    .canThis({app: {}}) // app context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function () {
                        done(new Error('was able to edit tag without permission'));
                    })
                    .catch(function (err) {
                        effectiveAppStub.callCount.should.eql(1);
                        err.errorType.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('No permissions: cannot edit tag (no permissible function on model)', function (done) {
                var effectiveAppStub = sandbox.stub(effective, 'app', function () {
                        // Fake the response from effective.app, which contains an empty array for this case
                        return Promise.resolve([]);
                    }),
                    effectiveUserStub = sandbox.stub(effective, 'user', function () {
                        // Fake the response from effective.user, which contains permissions and roles
                        return Promise.resolve({
                            permissions: [],
                            roles: undefined
                        });
                    });

                permissions
                    .canThis({app: {}, user: {}}) // app context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function () {
                        done(new Error('was able to edit tag without permission'));
                    })
                    .catch(function (err) {
                        effectiveAppStub.callCount.should.eql(1);
                        effectiveUserStub.callCount.should.eql(1);
                        err.errorType.should.eql('NoPermissionError');
                        done();
                    });
            });

            it('With permissions: can edit specific tag (no permissible function on model)', function (done) {
                var effectiveAppStub = sandbox.stub(effective, 'app', function () {
                        // Fake the response from effective.app, which contains permissions only
                        return Promise.resolve({
                            permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models
                        });
                    }),
                    effectiveUserStub = sandbox.stub(effective, 'user', function () {
                        // Fake the response from effective.user, which contains permissions and roles
                        return Promise.resolve({
                            permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                            roles: undefined
                        });
                    });

                permissions
                    .canThis({app: {}, user: {}}) // app context
                    .edit
                    .tag({id: 1}) // tag id in model syntax
                    .then(function (res) {
                        effectiveAppStub.callCount.should.eql(1);
                        effectiveUserStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });

            it('With permissions: can edit non-specific tag (no permissible function on model)', function (done) {
                var effectiveAppStub = sandbox.stub(effective, 'app', function () {
                        // Fake the response from effective.app, which contains permissions only
                        return Promise.resolve({
                            permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models
                        });
                    }),
                    effectiveUserStub = sandbox.stub(effective, 'user', function () {
                        // Fake the response from effective.user, which contains permissions and roles
                        return Promise.resolve({
                            permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                            roles: undefined
                        });
                    });

                permissions
                    .canThis({app: {}, user: {}}) // app context
                    .edit
                    .tag() // tag id in model syntax
                    .then(function (res) {
                        effectiveAppStub.callCount.should.eql(1);
                        effectiveUserStub.callCount.should.eql(1);
                        should.not.exist(res);
                        done();
                    })
                    .catch(done);
            });
        });
    });

    describe('permissible (overridden)', function () {
        it('can use permissible function on model to forbid something (post model)', function (done) {
            var effectiveUserStub = sandbox.stub(effective, 'user', function () {
                    // Fake the response from effective.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: undefined
                    });
                }),
                permissibleStub = sandbox.stub(models.Post, 'permissible', function () {
                    return Promise.reject({message: 'Hello World!'});
                });

            permissions
                .canThis({user: {}}) // user context
                .edit
                .post({id: 1}) // tag id in model syntax
                .then(function () {
                    done(new Error('was able to edit post without permission'));
                })
                .catch(function (err) {
                    permissibleStub.callCount.should.eql(1);
                    effectiveUserStub.callCount.should.eql(1);
                    err.message.should.eql('Hello World!');
                    done();
                });
        });

        it('can use permissible function on model to allow something (post model)', function (done) {
            var effectiveUserStub = sandbox.stub(effective, 'user', function () {
                    // Fake the response from effective.user, which contains permissions and roles
                    return Promise.resolve({
                        permissions: models.Permissions.forge(testUtils.DataGenerator.Content.permissions).models,
                        roles: undefined
                    });
                }),
                permissibleStub = sandbox.stub(models.Post, 'permissible', function () {
                    return Promise.resolve();
                });

            permissions
                .canThis({user: {}}) // user context
                .edit
                .post({id: 1}) // tag id in model syntax
                .then(function (res) {
                    permissibleStub.callCount.should.eql(1);
                    effectiveUserStub.callCount.should.eql(1);
                    should.not.exist(res);
                    done();
                })
                .catch(done);
        });
    });
});
