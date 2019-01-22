var should = require('should'),
    _ = require('lodash'),
    supertest = require('supertest'),
    moment = require('moment'),
    Promise = require('bluebird'),
    testUtils = require('../../../utils/index'),
    localUtils = require('./utils'),
    ObjectId = require('bson-objectid'),
    config = require('../../../../server/config/index'),
    models = require('../../../../server/models/index'),
    ghost = testUtils.startGhost,
    request;

describe('User API', function () {
    var ownerAccessToken = '',
        editorAccessToken = '',
        authorAccessToken = '',
        editor, author, ghostServer, inactiveUser, admin;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                // create editor
                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+1@ghost.org'}),
                    role: testUtils.DataGenerator.Content.roles[1].name
                });
            })
            .then(function (_user1) {
                editor = _user1;

                // create author
                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+2@ghost.org'}),
                    role: testUtils.DataGenerator.Content.roles[2].name
                });
            })
            .then(function (_user2) {
                author = _user2;

                // create inactive user
                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+3@ghost.org', status: 'inactive'}),
                    role: testUtils.DataGenerator.Content.roles[2].name
                });
            })
            .then(function (_user3) {
                inactiveUser = _user3;

                // create admin user
                return testUtils.createUser({
                    user: testUtils.DataGenerator.forKnex.createUser({email: 'test+admin@ghost.org'}),
                    role: testUtils.DataGenerator.Content.roles[0].name
                });
            })
            .then(function (_user4) {
                admin = _user4;

                // by default we login with the owner
                return localUtils.doAuth(request);
            })
            .then(function (token) {
                ownerAccessToken = token;

                request.user = editor;
                return localUtils.doAuth(request);
            })
            .then(function (token) {
                editorAccessToken = token;

                request.user = author;
                return localUtils.doAuth(request);
            })
            .then(function (token) {
                authorAccessToken = token;
            });
    });

    describe('As Owner', function () {
        describe('Browse', function () {
            it('returns dates in ISO 8601 format', function (done) {
                // @NOTE: ASC is default
                request.get(localUtils.API.getApiQuery('users/?order=id%20DESC'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);

                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        localUtils.API.checkResponse(jsonResponse, 'users');

                        // owner use + ghost-author user when Ghost starts
                        // and two extra users, see createUser in before
                        jsonResponse.users.should.have.length(6);

                        localUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        testUtils.API.isISO8601(jsonResponse.users[5].last_seen).should.be.true();
                        testUtils.API.isISO8601(jsonResponse.users[5].created_at).should.be.true();
                        testUtils.API.isISO8601(jsonResponse.users[5].updated_at).should.be.true();

                        testUtils.API.isISO8601(jsonResponse.users[2].last_seen).should.be.true();
                        testUtils.API.isISO8601(jsonResponse.users[2].created_at).should.be.true();
                        testUtils.API.isISO8601(jsonResponse.users[2].updated_at).should.be.true();

                        jsonResponse.users[0].email.should.eql('test+admin@ghost.org');
                        jsonResponse.users[1].email.should.eql('test+3@ghost.org');
                        jsonResponse.users[1].status.should.eql(inactiveUser.status);
                        jsonResponse.users[5].email.should.eql(testUtils.DataGenerator.Content.users[0].email);

                        done();
                    });
            });

            it('can retrieve all users with includes', function (done) {
                request.get(localUtils.API.getApiQuery('users/?include=roles'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        localUtils.API.checkResponse(jsonResponse, 'users');

                        jsonResponse.users.should.have.length(6);
                        localUtils.API.checkResponse(jsonResponse.users[0], 'user', 'roles');
                        done();
                    });
            });
        });

        describe('Read', function () {
            it('can retrieve a user by "me"', function (done) {
                request.get(localUtils.API.getApiQuery('users/me/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        localUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        done();
                    });
            });

            it('can retrieve a user by id', function (done) {
                request.get(localUtils.API.getApiQuery('users/' + author.id + '/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        localUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        done();
                    });
            });

            it('can retrieve a user by slug', function (done) {
                request.get(localUtils.API.getApiQuery('users/slug/joe-bloggs/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        localUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        done();
                    });
            });

            it('can retrieve a user by email', function (done) {
                request.get(localUtils.API.getApiQuery('users/email/jbloggs%40example.com/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        localUtils.API.checkResponse(jsonResponse.users[0], 'user');
                        done();
                    });
            });

            it('can retrieve a user with includes', function (done) {
                request.get(localUtils.API.getApiQuery('users/me/?include=roles,roles.permissions,count.posts'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users);
                        should.not.exist(jsonResponse.meta);

                        jsonResponse.users.should.have.length(1);
                        localUtils.API.checkResponse(jsonResponse.users[0], 'user', ['roles', 'count']);
                        localUtils.API.checkResponse(jsonResponse.users[0].roles[0], 'role', ['permissions']);
                        done();
                    });
            });

            it('can\'t retrieve non existent user by id', function (done) {
                request.get(localUtils.API.getApiQuery('users/' + ObjectId.generate() + '/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.errors);
                        testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                        done();
                    });
            });

            it('can\'t retrieve non existent user by slug', function (done) {
                request.get(localUtils.API.getApiQuery('users/slug/blargh/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .set('Accept', 'application/json')
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        var jsonResponse = res.body;
                        should.exist(jsonResponse);
                        should.exist(jsonResponse.errors);
                        testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                        done();
                    });
            });
        });

        describe('Edit', function () {
            it('can edit a user', function (done) {
                request.put(localUtils.API.getApiQuery('users/me/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .send({
                        users: [{
                            website: 'http://joe-bloggs.ghost.org',
                            password: 'mynewfancypasswordwhichisnotallowed'
                        }]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var putBody = res.body;
                        res.headers['x-cache-invalidate'].should.eql('/*');
                        should.exist(putBody.users[0]);
                        putBody.users[0].website.should.eql('http://joe-bloggs.ghost.org');
                        putBody.users[0].email.should.eql('jbloggs@example.com');
                        localUtils.API.checkResponse(putBody.users[0], 'user');

                        should.not.exist(putBody.users[0].password);

                        models.User.findOne({id: putBody.users[0].id})
                            .then((user) => {
                                return models.User.isPasswordCorrect({
                                    plainPassword: 'mynewfancypasswordwhichisnotallowed',
                                    hashedPassword: user.get('password')
                                });
                            })
                            .then(Promise.reject)
                            .catch((err) => {
                                err.code.should.eql('PASSWORD_INCORRECT');
                                done();
                            });
                    });
            });

            it('can\'t edit a user with invalid accesstoken', function () {
                return request.put(localUtils.API.getApiQuery('users/me/'))
                    .set('Authorization', 'Bearer ' + 'invalidtoken')
                    .send({
                        posts: []
                    })
                    .expect(401);
            });

            it('check which fields can be modified', function (done) {
                var existingUserData, modifiedUserData;

                request.get(localUtils.API.getApiQuery('users/me/'))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        var jsonResponse = res.body;
                        should.exist(jsonResponse.users[0]);
                        existingUserData = _.cloneDeep(jsonResponse.users[0]);
                        modifiedUserData = _.cloneDeep(jsonResponse);

                        existingUserData.created_by.should.eql('1');
                        existingUserData.updated_by.should.eql('1');

                        modifiedUserData.users[0].created_at = moment().add(2, 'days').format();
                        modifiedUserData.users[0].updated_at = moment().add(2, 'days').format();
                        modifiedUserData.users[0].created_by = ObjectId.generate();
                        modifiedUserData.users[0].updated_by = ObjectId.generate();

                        delete jsonResponse.users[0].id;

                        request.put(localUtils.API.getApiQuery('users/me/'))
                            .set('Authorization', 'Bearer ' + ownerAccessToken)
                            .send(jsonResponse)
                            .expect(200)
                            .end(function (err, res) {
                                if (err) {
                                    return done(err);
                                }

                                var jsonResponse = res.body;
                                should.exist(jsonResponse.users[0]);

                                jsonResponse.users[0].created_by.should.eql(existingUserData.created_by);
                                jsonResponse.users[0].updated_by.should.eql(existingUserData.updated_by);
                                jsonResponse.users[0].updated_at.should.not.eql(modifiedUserData.updated_at);
                                jsonResponse.users[0].created_at.should.eql(existingUserData.created_at);

                                done();
                            });
                    });
            });
        });

        describe('Destroy', function () {
            it('[success] Destroy active user', function () {
                return request
                    .get(localUtils.API.getApiQuery(`posts/?filter=author_id:${testUtils.existingData.users[1].id}`))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect(200)
                    .then((res) => {
                        res.body.posts.length.should.eql(7);

                        return request
                            .delete(localUtils.API.getApiQuery(`users/${testUtils.existingData.users[1].id}`))
                            .set('Authorization', 'Bearer ' + ownerAccessToken)
                            .expect(204);
                    })
                    .then(() => {
                        return request
                            .get(localUtils.API.getApiQuery(`users/${testUtils.existingData.users[1].id}/`))
                            .set('Authorization', 'Bearer ' + ownerAccessToken)
                            .expect(404);
                    })
                    .then(() => {
                        return request
                            .get(localUtils.API.getApiQuery(`posts/?filter=author_id:${testUtils.existingData.users[1].id}`))
                            .set('Authorization', 'Bearer ' + ownerAccessToken)
                            .expect(200);
                    })
                    .then((res) => {
                        res.body.posts.length.should.eql(0);
                    });
            });

            it('[failure] Destroy unknown user id', function (done) {
                request.delete(localUtils.API.getApiQuery('users/' + ObjectId.generate()))
                    .set('Authorization', 'Bearer ' + ownerAccessToken)
                    .expect(403)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
        });
    });

    describe('Transfer ownership', function () {
        it('Owner can transfer ownership to admin user', function () {
            return request
                .put(localUtils.API.getApiQuery('users/owner'))
                .set('Authorization', 'Bearer ' + ownerAccessToken)
                .send({
                    owner: [{
                        id: admin.id
                    }]
                })
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(200)
                .then((res) => {
                    res.body.users.length.should.eql(2);
                    res.body.users[0].roles[0].name.should.equal(testUtils.DataGenerator.Content.roles[0].name);
                    res.body.users[1].roles[0].name.should.equal(testUtils.DataGenerator.Content.roles[3].name);
                });
        });
    });

    describe('As Editor', function () {
        describe('success cases', function () {
            it('can edit himself', function (done) {
                request.put(localUtils.API.getApiQuery('users/' + editor.id + '/'))
                    .set('Authorization', 'Bearer ' + editorAccessToken)
                    .send({
                        users: [{id: editor.id, name: 'test'}]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
        });

        describe('error cases', function () {
            it('can\'t edit the owner', function (done) {
                request.put(localUtils.API.getApiQuery('users/' + testUtils.DataGenerator.Content.users[0].id + '/'))
                    .set('Authorization', 'Bearer ' + editorAccessToken)
                    .send({
                        users: [{
                            id: testUtils.DataGenerator.Content.users[0].id
                        }]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(403)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
        });
    });

    describe('As Author', function () {
        describe('success cases', function () {
            it('can edit himself', function (done) {
                request.put(localUtils.API.getApiQuery('users/' + author.id + '/'))
                    .set('Authorization', 'Bearer ' + authorAccessToken)
                    .send({
                        users: [{id: author.id, name: 'test'}]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
        });

        describe('error cases', function () {
            it('can\'t edit the owner', function (done) {
                request.put(localUtils.API.getApiQuery('users/' + testUtils.DataGenerator.Content.users[0].id + '/'))
                    .set('Authorization', 'Bearer ' + authorAccessToken)
                    .send({
                        users: [{
                            id: testUtils.DataGenerator.Content.users[0].id
                        }]
                    })
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(403)
                    .end(function (err) {
                        if (err) {
                            return done(err);
                        }

                        done();
                    });
            });
        });
    });
});
