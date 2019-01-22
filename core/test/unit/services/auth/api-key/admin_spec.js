const jwt = require('jsonwebtoken');
const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const apiKeyAuth = require('../../../../../server/services/auth/api-key');
const common = require('../../../../../server/lib/common');
const models = require('../../../../../server/models');
const testUtils = require('../../../../utils');

describe('Admin API Key Auth', function () {
    before(models.init);

    beforeEach(function () {
        const fakeApiKey = {
            id: '1234',
            type: 'admin',
            secret: Buffer.from('testing').toString('hex'),
            get(prop) {
                return this[prop];
            }
        };
        this.fakeApiKey = fakeApiKey;
        this.secret = Buffer.from(fakeApiKey.secret, 'hex');

        this.apiKeyStub = sinon.stub(models.ApiKey, 'findOne');
        this.apiKeyStub.resolves();
        this.apiKeyStub.withArgs({id: fakeApiKey.id}).resolves(fakeApiKey);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('should authenticate known+valid API key', function (done) {
        const token = jwt.sign({
            kid: this.fakeApiKey.id
        }, this.secret, {
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/test/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/test/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, (err) => {
            should.not.exist(err);
            req.api_key.should.eql(this.fakeApiKey);
            done();
        });
    });

    it('shouldn\'t authenticate with missing Ghost token', function (done) {
        const token = '';
        const req = {
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_AUTH_HEADER');
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with broken Ghost token', function (done) {
        const token = 'invalid';
        const req = {
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.BadRequestError, true);
            err.code.should.eql('INVALID_JWT');
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with invalid/unknown key', function (done) {
        const token = jwt.sign({
            kid: 'unknown'
        }, this.secret, {
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/test/',
            issuer: 'unknown'
        });

        const req = {
            originalUrl: '/test/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('UNKNOWN_ADMIN_API_KEY');
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with JWT signed > 5min ago', function (done) {
        const payload = {
            kid: this.fakeApiKey.id,
            iat: Math.floor(Date.now() / 1000) - 6 * 60
        };
        const token = jwt.sign(payload, this.secret, {
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/test/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/test/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_JWT');
            err.message.should.match(/jwt expired/);
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with JWT with maxAge > 5min', function (done) {
        const payload = {
            kid: this.fakeApiKey.id,
            iat: Math.floor(Date.now() / 1000) - 6 * 60
        };
        const token = jwt.sign(payload, this.secret, {
            algorithm: 'HS256',
            expiresIn: '10m',
            audience: '/test/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/test/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_JWT');
            err.message.should.match(/maxAge exceeded/);
            should.not.exist(req.api_key);
            done();
        });
    });

    it('shouldn\'t authenticate with a Content API Key', function (done) {
        const token = jwt.sign({
            kid: this.fakeApiKey.id
        }, this.secret, {
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: '/test/',
            issuer: this.fakeApiKey.id
        });

        const req = {
            originalUrl: '/test/',
            headers: {
                authorization: `Ghost ${token}`
            }
        };
        const res = {};

        this.fakeApiKey.type = 'content';

        apiKeyAuth.admin.authenticate(req, res, function next(err) {
            should.exist(err);
            should.equal(err instanceof common.errors.UnauthorizedError, true);
            err.code.should.eql('INVALID_API_KEY_TYPE');
            should.not.exist(req.api_key);
            done();
        });
    });
});
