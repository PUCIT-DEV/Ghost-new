var sinon = require('sinon'),
    should = require('should'),
    Promise = require('bluebird'),
    passport = require('passport'),
    testUtils = require('../../utils'),
    oAuth = require('../../../server/auth/oauth'),
    spamPrevention = require('../../../server/middleware/api/spam-prevention'),
    api = require('../../../server/api'),
    errors = require('../../../server/errors'),
    models = require('../../../server/models');

describe('OAuth', function () {
    var next, req, res, sandbox;

    before(function () {
        models.init();
    });

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        req = {};
        res = {};
        next = sandbox.spy();

        sandbox.stub(spamPrevention.userLogin, 'reset');
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Generate Token from Password', function () {
        beforeEach(function () {
            sandbox.stub(models.Accesstoken, 'destroyAllExpired')
                .returns(new Promise.resolve());
            sandbox.stub(models.Refreshtoken, 'destroyAllExpired')
                .returns(new Promise.resolve());
            oAuth.init();
        });

        it('Successfully generate access token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };
            req.connection = {remoteAddress: '127.0.0.1'};
            req.authInfo = {ip: '127.0.0.1'};

            req.body.grant_type = 'password';
            req.body.username = 'username';
            req.body.password = 'password';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.Client, 'findOne')
                .withArgs({slug: 'test'}).returns(new Promise.resolve({
                id: 1
            }));

            sandbox.stub(models.User, 'check')
                .withArgs({email: 'username', password: 'password'}).returns(new Promise.resolve({
                id: 1
            }));

            sandbox.stub(models.Accesstoken, 'add')
                .returns(new Promise.resolve());

            sandbox.stub(models.Refreshtoken, 'add')
                .returns(new Promise.resolve());

            sandbox.stub(res, 'setHeader', function () {});

            sandbox.stub(res, 'end', function (json) {
                try {
                    should.exist(json);
                    json = JSON.parse(json);
                    json.should.have.property('access_token');
                    json.should.have.property('refresh_token');
                    json.should.have.property('expires_in');
                    json.should.have.property('token_type', 'Bearer');
                    next.called.should.eql(false);
                    spamPrevention.userLogin.reset.called.should.eql(true);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            oAuth.generateAccessToken(req, res, next);
        });

        it('Can\'t generate access token without client.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };

            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'password';
            req.body.username = 'username';
            req.body.password = 'password';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.Client, 'findOne')
                .withArgs({slug: 'test'}).returns(new Promise.resolve());

            oAuth.generateAccessToken(req, res, function (err) {
                err.errorType.should.eql('NoPermissionError');
                done();
            });
        });

        it('Handles database error.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };

            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'password';
            req.body.username = 'username';
            req.body.password = 'password';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.Client, 'findOne')
                .withArgs({slug: 'test'}).returns(new Promise.resolve({
                id: 1
            }));

            sandbox.stub(models.User, 'check')
                .withArgs({email: 'username', password: 'password'}).returns(new Promise.resolve({
                id: 1
            }));

            sandbox.stub(models.Accesstoken, 'add')
                .returns(new Promise.reject({
                    message: 'DB error'
                }));

            oAuth.generateAccessToken(req, res, function (err) {
                err.message.should.eql('DB error');
                done();
            });
        });
    });

    describe('Generate Token from Refreshtoken', function () {
        beforeEach(function () {
            sandbox.stub(models.Accesstoken, 'destroyAllExpired')
                .returns(new Promise.resolve());
            sandbox.stub(models.Refreshtoken, 'destroyAllExpired')
                .returns(new Promise.resolve());

            oAuth.init();
        });

        it('Successfully generate access token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };
            req.authInfo = {ip: '127.0.0.1'};
            req.connection = {remoteAddress: '127.0.0.1'};
            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve({
                toJSON: function () {
                    return {
                        expires: Date.now() + 3600
                    };
                }
            }));

            sandbox.stub(models.Accesstoken, 'add')
                .returns(new Promise.resolve());

            sandbox.stub(models.Refreshtoken, 'edit')
                .returns(new Promise.resolve());

            sandbox.stub(res, 'setHeader', function () {});

            sandbox.stub(res, 'end', function (json) {
                try {
                    should.exist(json);
                    json = JSON.parse(json);
                    json.should.have.property('access_token');
                    json.should.have.property('expires_in');
                    json.should.have.property('token_type', 'Bearer');
                    next.called.should.eql(false);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            oAuth.generateAccessToken(req, res, next);
        });

        it('Can\'t generate access token without valid refresh token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };
            req.connection = {remoteAddress: '127.0.0.1'};
            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve());

            oAuth.generateAccessToken(req, res, function (err) {
                err.errorType.should.eql('NoPermissionError');
                done();
            });
        });

        it('Can\'t generate access token with expired refresh token.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };
            req.connection = {remoteAddress: '127.0.0.1'};
            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve({
                toJSON: function () {
                    return {
                        expires: Date.now() - 3600
                    };
                }
            }));

            oAuth.generateAccessToken(req, res, function (err) {
                err.errorType.should.eql('UnauthorizedError');
                done();
            });
        });

        it('Handles database error.', function (done) {
            req.body = {};
            req.client = {
                slug: 'test'
            };
            req.connection = {remoteAddress: '127.0.0.1'};
            req.authInfo = {ip: '127.0.0.1'};
            req.body.grant_type = 'refresh_token';
            req.body.refresh_token = 'token';
            res.setHeader = {};
            res.end = {};

            sandbox.stub(models.Refreshtoken, 'findOne')
                .withArgs({token: 'token'}).returns(new Promise.resolve({
                toJSON: function () {
                    return {
                        expires: Date.now() + 3600
                    };
                }
            }));

            sandbox.stub(models.Accesstoken, 'add')
                .returns(new Promise.reject({
                    message: 'DB error'
                }));

            oAuth.generateAccessToken(req, res, function (err) {
                err.message.should.eql('DB error');
                done();
            });
        });
    });

    describe('Generate Token from Authorization Code', function () {
        beforeEach(function () {
            sandbox.stub(models.Accesstoken, 'destroyAllExpired')
                .returns(new Promise.resolve());

            sandbox.stub(models.Refreshtoken, 'destroyAllExpired')
                .returns(new Promise.resolve());

            oAuth.init();
        });

        it('Successfully generate access token.', function (done) {
            var user = new models.User(testUtils.DataGenerator.forKnex.createUser());

            req.body = {};
            req.query = {};
            req.client = {
                id: 1
            };
            req.authInfo = {ip: '127.0.0.1'};
            req.connection = {remoteAddress: '127.0.0.1'};
            req.body.grant_type = 'authorization_code';
            req.body.authorizationCode = '1234';

            res.json = function (data) {
                data.access_token.should.eql('access-token');
                data.refresh_token.should.eql('refresh-token');
                data.expires_in.should.eql(10);
                done();
            };

            sandbox.stub(api.authentication, 'createTokens').returns(Promise.resolve({
                access_token: 'access-token',
                refresh_token: 'refresh-token',
                expires_in: 10
            }));

            sandbox.stub(passport, 'authenticate', function (name, options, onSuccess) {
                return function () {
                    onSuccess(null, user);
                };
            });

            oAuth.generateAccessToken(req, res, next);
        });

        it('Error: ghost.org', function (done) {
            req.body = {};
            req.query = {};
            req.client = {
                id: 1
            };

            req.authInfo = {ip: '127.0.0.1'};
            req.connection = {remoteAddress: '127.0.0.1'};
            req.body.grant_type = 'authorization_code';
            req.body.authorizationCode = '1234';

            sandbox.stub(passport, 'authenticate', function (name, options, onSuccess) {
                return function () {
                    onSuccess(new Error('validation error'));
                };
            });

            oAuth.generateAccessToken(req, res, function (err) {
                should.exist(err);
                (err instanceof errors.UnauthorizedError).should.eql(true);
                done();
            });
        });

        it('Error: no authorization_code provided', function (done) {
            req.body = {};
            req.query = {};
            req.client = {
                id: 1
            };
            req.connection = {remoteAddress: '127.0.0.1'};
            req.body.grant_type = 'authorization_code';

            oAuth.generateAccessToken(req, res, function (err) {
                should.exist(err);
                (err instanceof errors.UnauthorizedError).should.eql(true);
                done();
            });
        });
    });
});
