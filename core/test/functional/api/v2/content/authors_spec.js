const should = require('should');
const supertest = require('supertest');
const _ = require('lodash');
const url = require('url');
const configUtils = require('../../../../utils/configUtils');
const config = require('../../../../../../core/server/config');
const models = require('../../../../../../core/server/models');
const testUtils = require('../../../../utils');
const localUtils = require('./utils');
const ghost = testUtils.startGhost;
let request;

describe('Authors Content API V2', function () {
    let ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return testUtils.initFixtures('users:no-owner', 'user:inactive', 'posts', 'api_keys');
            });
    });

    afterEach(function () {
        configUtils.restore();
    });

    const validKey = localUtils.getValidKey();

    it('browse authors', function (done) {
        request.get(localUtils.API.getApiQuery(`authors/?key=${validKey}`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.authors);
                testUtils.API.checkResponse(jsonResponse, 'authors');
                jsonResponse.authors.should.have.length(7);

                // We don't expose the email address, status and other attrs.
                testUtils.API.checkResponse(jsonResponse.authors[0], 'author', ['url'], null, null, {public: true});

                should.exist(res.body.authors[0].url);
                should.exist(url.parse(res.body.authors[0].url).protocol);
                should.exist(url.parse(res.body.authors[0].url).host);

                // Public api returns all authors, but no status! Locked/Inactive authors can still have written articles.
                models.User.findPage(Object.assign({status: 'all'}, testUtils.context.internal))
                    .then((response) => {
                        _.map(response.data, (model) => model.toJSON()).length.should.eql(7);
                        done();
                    });
            });
    });

    it('browse authors: throws error if trying to fetch roles', function (done) {
        request.get(localUtils.API.getApiQuery(`authors/?key=${validKey}&include=roles`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(422)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                done();
            });
    });

    it('browse user by slug: count.posts', function (done) {
        request.get(localUtils.API.getApiQuery(`authors/slug/ghost/?key=${validKey}&include=count.posts`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse.authors);
                jsonResponse.authors.should.have.length(1);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.authors[0], 'author', ['count', 'url'], null, null, {public: true});
                done();
            });
    });

    it('browse user by id: count.posts', function (done) {
        request.get(localUtils.API.getApiQuery(`authors/1/?key=${validKey}&include=count.posts`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;

                should.exist(jsonResponse.authors);
                jsonResponse.authors.should.have.length(1);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.authors[0], 'author', ['count', 'url'], null, null, {public: true});
                done();
            });
    });

    it('browse user with count.posts', function (done) {
        request.get(localUtils.API.getApiQuery(`authors/?key=${validKey}&include=count.posts&order=count.posts ASC`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;

                should.exist(jsonResponse.authors);
                jsonResponse.authors.should.have.length(7);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.authors[0], 'author', ['count', 'url'], null, null, {public: true});

                // Each user should have the correct count
                _.find(jsonResponse.authors, {slug:'joe-bloggs'}).count.posts.should.eql(4);
                _.find(jsonResponse.authors, {slug:'contributor'}).count.posts.should.eql(0);
                _.find(jsonResponse.authors, {slug:'slimer-mcectoplasm'}).count.posts.should.eql(1);
                _.find(jsonResponse.authors, {slug:'jimothy-bogendath'}).count.posts.should.eql(0);
                _.find(jsonResponse.authors, {slug: 'smith-wellingsworth'}).count.posts.should.eql(0);
                _.find(jsonResponse.authors, {slug:'ghost'}).count.posts.should.eql(7);
                _.find(jsonResponse.authors, {slug:'inactive'}).count.posts.should.eql(0);

                const ids = jsonResponse.authors
                    .filter(author => (author.slug !== 'ghost'))
                    .filter(author => (author.slug !== 'inactive'))
                    .map(user=> user.id);

                ids.should.eql([
                    testUtils.DataGenerator.Content.users[1].id,
                    testUtils.DataGenerator.Content.users[2].id,
                    testUtils.DataGenerator.Content.users[7].id,
                    testUtils.DataGenerator.Content.users[3].id,
                    testUtils.DataGenerator.Content.users[0].id
                ]);

                done();
            });
    });

    it('browse authors: post count', function (done) {
        request.get(localUtils.API.getApiQuery(`authors/?key=${validKey}&include=count.posts`))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse.authors);
                testUtils.API.checkResponse(jsonResponse, 'authors');
                jsonResponse.authors.should.have.length(7);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.authors[0], 'author', ['count', 'url'], null, null, {public: true});
                done();
            });
    });
});
