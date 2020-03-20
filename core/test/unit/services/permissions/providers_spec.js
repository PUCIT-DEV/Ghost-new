var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../../utils'),
    Promise = require('bluebird'),
    models = require('../../../../server/models'),
    providers = require('../../../../server/services/permissions/providers');

describe('Permission Providers', function () {
    before(function () {
        models.init();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('User', function () {
        it('errors if user cannot be found', function (done) {
            var findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                return Promise.resolve();
            });

            providers.user(1)
                .then(function () {
                    done(new Error('Should have thrown a user not found error'));
                })
                .catch(function (err) {
                    findUserSpy.callCount.should.eql(1);
                    err.errorType.should.eql('NotFoundError');
                    done();
                });
        });

        it('can load user with role, and permissions', function (done) {
            // This test requires quite a lot of unique setup work
            var findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                // Create a fake model
                var fakeUser = models.User.forge(testUtils.DataGenerator.Content.users[0]),
                    // Roles & Permissions need to be collections
                    fakeAdminRole = models.Roles.forge(testUtils.DataGenerator.Content.roles[0]),
                    fakeAdminRolePermissions = models.Permissions.forge(testUtils.DataGenerator.Content.permissions);

                // ## Fake the relations
                // User is related to roles & permissions
                fakeUser.relations = {
                    roles: fakeAdminRole,
                    permissions: fakeAdminRolePermissions
                };

                // We use this inside toJSON.
                fakeUser.withRelated = ['roles', 'permissions', 'roles.permissions'];

                return Promise.resolve(fakeUser);
            });

            // Get permissions for the user
            providers.user(1)
                .then(function (res) {
                    findUserSpy.callCount.should.eql(1);

                    res.should.be.an.Object().with.properties('permissions', 'roles');

                    res.permissions.should.be.an.Array().with.lengthOf(10);
                    res.roles.should.be.an.Array().with.lengthOf(1);

                    // @TODO fix this!
                    // Permissions is an array of models
                    // Roles is a JSON array
                    res.permissions[0].should.be.an.Object().with.properties('attributes', 'id');
                    res.roles[0].should.be.an.Object().with.properties('id', 'name', 'description');
                    res.permissions[0].should.be.instanceOf(models.Base.Model);
                    res.roles[0].should.not.be.instanceOf(models.Base.Model);

                    done();
                })
                .catch(done);
        });

        it('can load user with role, and role.permissions', function (done) {
            // This test requires quite a lot of unique setup work
            var findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                // Create a fake model
                var fakeUser = models.User.forge(testUtils.DataGenerator.Content.users[0]),
                    // Roles & Permissions need to be collections
                    fakeAdminRole = models.Roles.forge(testUtils.DataGenerator.Content.roles[0]),
                    fakeAdminRolePermissions = models.Permissions.forge(testUtils.DataGenerator.Content.permissions);

                // ## Fake the relations
                // Roles are related to permissions
                fakeAdminRole.models[0].relations = {
                    permissions: fakeAdminRolePermissions
                };
                // User is related to roles
                fakeUser.relations = {
                    roles: fakeAdminRole
                };
                // We use this inside toJSON.
                fakeUser.withRelated = ['roles', 'permissions', 'roles.permissions'];

                return Promise.resolve(fakeUser);
            });

            // Get permissions for the user
            providers.user(1)
                .then(function (res) {
                    findUserSpy.callCount.should.eql(1);

                    res.should.be.an.Object().with.properties('permissions', 'roles');

                    res.permissions.should.be.an.Array().with.lengthOf(10);
                    res.roles.should.be.an.Array().with.lengthOf(1);

                    // @TODO fix this!
                    // Permissions is an array of models
                    // Roles is a JSON array
                    res.permissions[0].should.be.an.Object().with.properties('attributes', 'id');
                    res.roles[0].should.be.an.Object().with.properties('id', 'name', 'description');
                    res.permissions[0].should.be.instanceOf(models.Base.Model);
                    res.roles[0].should.not.be.instanceOf(models.Base.Model);

                    done();
                })
                .catch(done);
        });

        it('can load user with role, permissions and role.permissions and deduplicate them', function (done) {
            // This test requires quite a lot of unique setup work
            var findUserSpy = sinon.stub(models.User, 'findOne').callsFake(function () {
                // Create a fake model
                var fakeUser = models.User.forge(testUtils.DataGenerator.Content.users[0]),
                    // Roles & Permissions need to be collections
                    fakeAdminRole = models.Roles.forge(testUtils.DataGenerator.Content.roles[0]),
                    fakeAdminRolePermissions = models.Permissions.forge(testUtils.DataGenerator.Content.permissions);

                // ## Fake the relations
                // Roles are related to permissions
                fakeAdminRole.models[0].relations = {
                    permissions: fakeAdminRolePermissions
                };
                // User is related to roles and permissions
                fakeUser.relations = {
                    roles: fakeAdminRole,
                    permissions: fakeAdminRolePermissions
                };
                // We use this inside toJSON.
                fakeUser.withRelated = ['roles', 'permissions', 'roles.permissions'];

                return Promise.resolve(fakeUser);
            });

            // Get permissions for the user
            providers.user(1)
                .then(function (res) {
                    findUserSpy.callCount.should.eql(1);

                    res.should.be.an.Object().with.properties('permissions', 'roles');

                    res.permissions.should.be.an.Array().with.lengthOf(10);
                    res.roles.should.be.an.Array().with.lengthOf(1);

                    // @TODO fix this!
                    // Permissions is an array of models
                    // Roles is a JSON array
                    res.permissions[0].should.be.an.Object().with.properties('attributes', 'id');
                    res.roles[0].should.be.an.Object().with.properties('id', 'name', 'description');
                    res.permissions[0].should.be.instanceOf(models.Base.Model);
                    res.roles[0].should.not.be.instanceOf(models.Base.Model);

                    done();
                })
                .catch(done);
        });
    });

    describe('API Key', function () {
        it('errors if api_key cannot be found', function (done) {
            let findApiKeySpy = sinon.stub(models.ApiKey, 'findOne');
            findApiKeySpy.returns(new Promise.resolve());
            providers.apiKey(1)
                .then(() => {
                    done(new Error('Should have thrown an api key not found error'));
                })
                .catch((err) => {
                    findApiKeySpy.callCount.should.eql(1);
                    err.errorType.should.eql('NotFoundError');
                    done();
                });
        });
        it('can load api_key with role, and role.permissions', function (done) {
            const findApiKeySpy = sinon.stub(models.ApiKey, 'findOne').callsFake(function () {
                const fakeApiKey = models.ApiKey.forge(testUtils.DataGenerator.Content.api_keys[0]);
                const fakeAdminRole = models.Role.forge(testUtils.DataGenerator.Content.roles[0]);
                const fakeAdminRolePermissions = models.Permissions.forge(testUtils.DataGenerator.Content.permissions);
                fakeAdminRole.relations = {
                    permissions: fakeAdminRolePermissions
                };
                fakeApiKey.relations = {
                    role: fakeAdminRole
                };
                fakeApiKey.withRelated = ['role', 'role.permissions'];
                return Promise.resolve(fakeApiKey);
            });
            providers.apiKey(1).then((res) => {
                findApiKeySpy.callCount.should.eql(1);
                res.should.be.an.Object().with.properties('permissions', 'roles');
                res.roles.should.be.an.Array().with.lengthOf(1);
                res.permissions[0].should.be.an.Object().with.properties('attributes', 'id');
                res.roles[0].should.be.an.Object().with.properties('id', 'name', 'description');
                res.permissions[0].should.be.instanceOf(models.Base.Model);
                res.roles[0].should.not.be.instanceOf(models.Base.Model);
                done();
            }).catch(done);
        });
    });

    describe('App', function () {
        // @TODO make this consistent or sane or something!
        // Why is this an empty array, when the success is an object?
        // Also why is this an empty array when for users we error?!
        it('returns empty array if app cannot be found!', function (done) {
            var findAppSpy = sinon.stub(models.App, 'findOne').callsFake(function () {
                return Promise.resolve();
            });

            providers.app('test')
                .then(function (res) {
                    findAppSpy.callCount.should.eql(1);
                    res.should.be.an.Array().with.lengthOf(0);
                    done();
                })
                .catch(done);
        });

        it('can load user with role, and permissions', function (done) {
            // This test requires quite a lot of unique setup work
            var findAppSpy = sinon.stub(models.App, 'findOne').callsFake(function () {
                var fakeApp = models.App.forge(testUtils.DataGenerator.Content.apps[0]),
                    fakePermissions = models.Permissions.forge(testUtils.DataGenerator.Content.permissions);

                // ## Fake the relations
                fakeApp.relations = {
                    permissions: fakePermissions
                };
                fakeApp.include = ['permissions'];

                return Promise.resolve(fakeApp);
            });

            // Get permissions for the app
            providers.app('kudos')
                .then(function (res) {
                    findAppSpy.callCount.should.eql(1);

                    res.should.be.an.Object().with.properties('permissions');

                    res.permissions.should.be.an.Array().with.lengthOf(10);
                    should.not.exist(res.roles);

                    // @TODO fix this!
                    // Permissions is an array of models
                    // Roles is a JSON array
                    res.permissions[0].should.be.an.Object().with.properties('attributes', 'id');
                    res.permissions[0].should.be.instanceOf(models.Base.Model);

                    done();
                })
                .catch(done);
        });
    });
});

