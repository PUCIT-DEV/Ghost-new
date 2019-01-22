var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils/index'),
    localUtils = require('./utils'),
    path = require('path'),
    fs = require('fs-extra'),
    ghost = testUtils.startGhost,
    config = require('../../../../server/config/index'),
    request;

describe('Upload Icon API', function () {
    var accesstoken = '', icons = [], ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            })
            .then(function (token) {
                accesstoken = token;
            });
    });

    after(function () {
        icons.forEach(function (icon) {
            fs.removeSync(config.get('paths').appRoot + icon);
        });
    });

    describe('success cases for icons', function () {
        it('valid png', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/favicon.png'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    icons.push(res.body);
                    done();
                });
        });

        it('valid ico with multiple sizes', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/favicon_multi_sizes.ico'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    icons.push(res.body);
                    done();
                });
        });
        it('valid ico with one size', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/favicon_64x_single.ico'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    icons.push(res.body);
                    done();
                });
        });
    });

    describe('error cases for icons', function () {
        it('import should fail without file', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(403)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('import should fail with unsupported file', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/ghosticon.jpg'))
                .expect(415)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('incorrect extension', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .set('content-type', 'image/png')
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/ghost-logo.pngx'))
                .expect(415)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('import should fail, if icon is not square', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/favicon_not_square.png'))
                .expect(422)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('import should fail, if icon file size is too large', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/favicon_size_too_large.png'))
                .expect(422)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('import should fail, if icon dimensions are too large', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/favicon_too_large.png'))
                .expect(422)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('import should fail, if png icon dimensions are too small', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/favicon_too_small.png'))
                .expect(422)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
        it('import should fail, if png icon dimensions are too small', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/icon'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/favicon_16x_single.ico'))
                .expect(422)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
    });
});
