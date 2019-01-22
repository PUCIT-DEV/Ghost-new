var should = require('should'),
    supertest = require('supertest'),
    testUtils = require('../../../utils/index'),
    localUtils = require('./utils'),
    path = require('path'),
    fs = require('fs-extra'),
    ghost = testUtils.startGhost,
    config = require('../../../../server/config/index'),
    request;

describe('Upload API', function () {
    var accesstoken = '',
        images = [],
        ghostServer;

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
        images.forEach(function (image) {
            fs.removeSync(config.get('paths').appRoot + image);
        });
    });

    describe('success cases', function () {
        it('valid png', function (done) {
            request.post(localUtils.API.getApiQuery('uploads'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/ghost-logo.png'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    images.push(res.body);
                    done();
                });
        });

        it('valid jpg', function (done) {
            request.post(localUtils.API.getApiQuery('uploads'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/ghosticon.jpg'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    images.push(res.body);
                    done();
                });
        });

        it('valid gif', function (done) {
            request.post(localUtils.API.getApiQuery('uploads'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/loadingcat.gif'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    images.push(res.body);
                    done();
                });
        });

        it('valid profile image', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/profile-image'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/images/loadingcat_square.gif'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    images.push(res.body);
                    done();
                });
        });
    });

    describe('error cases', function () {
        it('import should fail without file', function (done) {
            request.post(localUtils.API.getApiQuery('uploads'))
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
            request.post(localUtils.API.getApiQuery('uploads'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .attach('uploadimage', path.join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv'))
                .expect(415)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('incorrect extension', function (done) {
            request.post(localUtils.API.getApiQuery('uploads'))
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

        it('import should fail if profile image is not square', function (done) {
            request.post(localUtils.API.getApiQuery('uploads/profile-image'))
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
    });
});
