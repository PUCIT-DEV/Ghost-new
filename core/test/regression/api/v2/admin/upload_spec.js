const path = require('path');
const fs = require('fs-extra');
const should = require('should');
const supertest = require('supertest');
const localUtils = require('./utils');
const testUtils = require('../../../../utils');
const config = require('../../../../../server/config');

const ghost = testUtils.startGhost;

describe('Upload API', function () {
    const images = [];
    let request;

    before(function () {
        return ghost()
            .then(function () {
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request);
            });
    });

    after(function () {
        images.forEach(function (image) {
            fs.removeSync(config.get('paths').appRoot + image);
        });
    });

    it('import should fail without file', function (done) {
        request.post(localUtils.API.getApiQuery('uploads'))
            .set('Origin', config.get('url'))
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
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('uploadimage', path.join(__dirname, '/../../../../utils/fixtures/csv/single-column-with-header.csv'))
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
            .set('Origin', config.get('url'))
            .set('content-type', 'image/png')
            .expect('Content-Type', /json/)
            .attach('uploadimage', path.join(__dirname, '/../../../../utils/fixtures/images/ghost-logo.pngx'))
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
            .set('Origin', config.get('url'))
            .expect('Content-Type', /json/)
            .attach('uploadimage', path.join(__dirname, '/../../../../utils/fixtures/images/favicon_not_square.png'))
            .expect(422)
            .end(function (err) {
                if (err) {
                    return done(err);
                }

                done();
            });
    });
});
