var supertest     = require('supertest'),
    should        = require('should'),
    path          = require('path'),
    testUtils     = require('../../../utils'),
    ghost         = testUtils.startGhost,
    request;

describe('DB API', function () {
    var accesstoken = '';

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
        }).then(function () {
            return testUtils.doAuth(request);
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(done);
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('attaches the Content-Disposition header on export', function (done) {
        request.get(testUtils.API.getApiQuery('db/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .expect('Content-Disposition', /Attachment; filename="[A-Za-z0-9._-]+\.json"/)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                done();
            });
    });

    it('should work with access token set as query parameter', function (done) {
        request.get(testUtils.API.getApiQuery('db/?access_token=' + accesstoken))
            .expect('Content-Type', /json/)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;
                should.exist(jsonResponse.db);
                jsonResponse.db.should.have.length(1);
                done();
            });
    });

    it('import should fail without file', function (done) {
        request.post(testUtils.API.getApiQuery('db/'))
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
        request.post(testUtils.API.getApiQuery('db/'))
            .set('Authorization', 'Bearer ' + accesstoken)
            .expect('Content-Type', /json/)
            .attach('importfile',  path.join(__dirname, '/../../../utils/fixtures/csv/single-column-with-header.csv'))
            .expect(415)
            .end(function (err) {
                if (err) {
                    return done(err);
                }

                done();
            });
    });
});
