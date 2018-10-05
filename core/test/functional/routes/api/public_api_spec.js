var should = require('should'),
    supertest = require('supertest'),
    _ = require('lodash'),
    url = require('url'),
    cheerio = require('cheerio'),
    moment = require('moment'),
    testUtils = require('../../../utils'),
    localUtils = require('./utils'),
    configUtils = require('../../../utils/configUtils'),
    config = require('../../../../../core/server/config'),
    ghost = testUtils.startGhost,
    request;

describe('Public API', function () {
    var ghostServer;

    before(function () {
        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            })
            .then(function () {
                return localUtils.doAuth(request, 'users:no-owner', 'posts', 'tags:extra', 'client:trusted-domain');
            });
    });

    afterEach(function () {
        configUtils.restore();
    });

    it('browse posts', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Origin, Accept-Encoding');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);

                var jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                testUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(11);
                testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                done();
            });
    });

    it('browse pages', function (done) {
        request.get('/ghost/api/v2/content/pages/?client_id=ghost-admin&client_secret=not_available')
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Origin, Accept-Encoding');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);

                const jsonResponse = res.body;
                should.exist(jsonResponse.pages);
                should.exist(jsonResponse.meta);
                jsonResponse.pages.should.have.length(1);
                done();
            });
    });

    it('browse posts: request absolute urls', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&absolute_urls=true'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.exist(res.body.posts);

                // kitchen sink
                res.body.posts[9].slug.should.eql(testUtils.DataGenerator.Content.posts[1].slug);

                let urlParts = url.parse(res.body.posts[9].feature_image);
                should.exist(urlParts.protocol);
                should.exist(urlParts.host);

                urlParts = url.parse(res.body.posts[9].url);
                should.exist(urlParts.protocol);
                should.exist(urlParts.host);

                const $ = cheerio.load(res.body.posts[9].html);
                urlParts = url.parse($('img').attr('src'));
                should.exist(urlParts.protocol);
                should.exist(urlParts.host);

                done();
            });
    });

    it('browse posts: request to include tags and authors with absolute_urls', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&absolute_urls=true&include=tags,authors'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.exist(res.body.posts);

                // kitchen sink
                res.body.posts[9].slug.should.eql(testUtils.DataGenerator.Content.posts[1].slug);

                should.exist(res.body.posts[9].tags);
                should.exist(res.body.posts[9].tags[0].url);
                should.exist(url.parse(res.body.posts[9].tags[0].url).protocol);
                should.exist(url.parse(res.body.posts[9].tags[0].url).host);

                should.exist(res.body.posts[9].primary_tag);
                should.exist(res.body.posts[9].primary_tag.url);
                should.exist(url.parse(res.body.posts[9].primary_tag.url).protocol);
                should.exist(url.parse(res.body.posts[9].primary_tag.url).host);

                should.exist(res.body.posts[9].authors);
                should.exist(res.body.posts[9].authors[0].url);
                should.exist(url.parse(res.body.posts[9].authors[0].url).protocol);
                should.exist(url.parse(res.body.posts[9].authors[0].url).host);

                should.exist(res.body.posts[9].primary_author);
                should.exist(res.body.posts[9].primary_author.url);
                should.exist(url.parse(res.body.posts[9].primary_author.url).protocol);
                should.exist(url.parse(res.body.posts[9].primary_author.url).host);

                done();
            });
    });

    it('browse posts: request to include tags and authors without absolute_urls', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&include=tags,authors'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.exist(res.body.posts);

                // kitchen sink
                res.body.posts[9].slug.should.eql(testUtils.DataGenerator.Content.posts[1].slug);

                should.exist(res.body.posts[9].tags);
                should.not.exist(res.body.posts[9].tags[0].url);

                should.exist(res.body.posts[9].primary_tag);
                should.not.exist(res.body.posts[9].primary_tag.url);

                should.exist(res.body.posts[9].authors);
                should.not.exist(res.body.posts[9].authors[0].url);

                should.exist(res.body.posts[9].primary_author);
                should.not.exist(res.body.posts[9].primary_author.url);

                done();
            });
    });

    it('browse posts from different origin', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-test&client_secret=not_available'))
            .set('Origin', 'https://example.com')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Origin, Accept-Encoding');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);

                var jsonResponse = res.body;
                should.exist(jsonResponse.posts);
                testUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(11);
                testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                done();
            });
    });

    it('ensure origin header on redirect is not getting lost', function (done) {
        // NOTE: force a redirect to the admin url
        configUtils.set('admin:url', 'http://localhost:9999');

        request.get(localUtils.API.getApiQuery('posts?client_id=ghost-test&client_secret=not_available'))
            .set('Origin', 'https://example.com')
            // 301 Redirects _should_ be cached
            .expect('Cache-Control', testUtils.cacheRules.year)
            .expect(301)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                res.headers.vary.should.eql('Origin, Accept, Accept-Encoding');
                res.headers.location.should.eql('http://localhost:9999/ghost/api/v0.1/posts/?client_id=ghost-test&client_secret=not_available');
                should.exist(res.headers['access-control-allow-origin']);
                should.not.exist(res.headers['x-cache-invalidate']);
                done();
            });
    });

    it('browse posts, ignores staticPages', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available&staticPages=true'))
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
                should.exist(jsonResponse.posts);
                testUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(11);
                testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                done();
            });
    });

    it('browse tags without limit defaults to 15', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?client_id=ghost-admin&client_secret=not_available'))
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
                should.exist(jsonResponse.tags);
                testUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(15);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags - limit=all should fetch all tags', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?limit=all&client_id=ghost-admin&client_secret=not_available'))
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
                should.exist(jsonResponse.tags);
                testUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(56);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags without limit=4 fetches 4 tags', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?limit=4&client_id=ghost-admin&client_secret=not_available'))
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
                should.exist(jsonResponse.tags);
                testUtils.API.checkResponse(jsonResponse, 'tags');
                jsonResponse.tags.should.have.length(4);
                testUtils.API.checkResponse(jsonResponse.tags[0], 'tag');
                testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                done();
            });
    });

    it('browse tags: request absolute urls', function (done) {
        request.get(localUtils.API.getApiQuery('tags/?client_id=ghost-admin&client_secret=not_available&absolute_urls=true'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.exist(res.body.tags[0].url);
                should.exist(url.parse(res.body.tags[0].url).protocol);
                should.exist(url.parse(res.body.tags[0].url).host);

                done();
            });
    });

    it('denies access with invalid client_secret', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=invalid_secret'))
            .set('Origin', testUtils.API.getURL())
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType', 'context']);
                done();
            });
    });

    it('denies access with invalid client_id', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=invalid-id&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(401)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                var jsonResponse = res.body;
                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType', 'context']);
                done();
            });
    });

    it('does not send CORS headers on an invalid origin', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', 'http://invalid-origin')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.not.exist(res.headers['x-cache-invalidate']);
                should.not.exist(res.headers['access-control-allow-origin']);

                done();
            });
    });

    it('denies access to settings endpoint', function (done) {
        request.get(localUtils.API.getApiQuery('settings/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(403)
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

    it('throws version mismatch error when request includes a version', function (done) {
        request.get(localUtils.API.getApiQuery('posts/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
            .set('Accept', 'application/json')
            .set('X-Ghost-Version', '0.3')
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(400)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                var jsonResponse = res.body;

                should.exist(jsonResponse);
                should.exist(jsonResponse.errors);
                testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'errorType']);
                jsonResponse.errors[0].errorType.should.eql('VersionMismatchError');

                done();
            });
    });

    it('browse users', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available'))
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
                should.exist(jsonResponse.users);
                testUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', null, null, null, {public: true});
                done();
            });
    });

    it('browse users: ignores fetching roles', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&include=roles'))
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
                should.exist(jsonResponse.users);
                testUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', null, null, null, {public: true});
                done();
            });
    });

    it('browse users: request absolute urls', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&absolute_urls=true'))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .end(function (err, res) {
                if (err) {
                    return done(err);
                }

                should.exist(res.body.users[0].url);
                should.exist(url.parse(res.body.users[0].url).protocol);
                should.exist(url.parse(res.body.users[0].url).host);

                done();
            });
    });

    it('browse user by slug: ignores fetching roles', function (done) {
        request.get(localUtils.API.getApiQuery('users/slug/ghost/?client_id=ghost-admin&client_secret=not_available&include=roles'))
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

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', null, null, null, {public: true});
                done();
            });
    });

    it('browse user by slug: count.posts', function (done) {
        request.get(localUtils.API.getApiQuery('users/slug/ghost/?client_id=ghost-admin&client_secret=not_available&include=count.posts'))
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

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count'], null, null, {public: true});
                done();
            });
    });

    it('browse user by id: count.posts', function (done) {
        request.get(localUtils.API.getApiQuery('users/1/?client_id=ghost-admin&client_secret=not_available&include=count.posts'))
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

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count'], null, null, {public: true});
                done();
            });
    });

    it('[unsupported] browse user by email', function (done) {
        request
            .get(localUtils.API.getApiQuery('users/email/ghost-author@ghost.org/?client_id=ghost-admin&client_secret=not_available'))
            .set('Origin', testUtils.API.getURL())
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

    it('browse user by id: ignores fetching roles', function (done) {
        request.get(localUtils.API.getApiQuery('users/1/?client_id=ghost-admin&client_secret=not_available&include=roles'))
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

                should.exist(jsonResponse.users);
                jsonResponse.users.should.have.length(1);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', null, null, null, {public: true});
                done();
            });
    });

    it('browse users: post count', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&include=count.posts'))
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
                should.exist(jsonResponse.users);
                testUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', ['count'], null, null, {public: true});
                done();
            });
    });

    it('browse users: wrong data type for include', function (done) {
        request.get(localUtils.API.getApiQuery('users/?client_id=ghost-admin&client_secret=not_available&include={}'))
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
                should.exist(jsonResponse.users);
                testUtils.API.checkResponse(jsonResponse, 'users');
                jsonResponse.users.should.have.length(7);

                // We don't expose the email address.
                testUtils.API.checkResponse(jsonResponse.users[0], 'user', null, null, null, {public: true});
                done();
            });
    });

    it('fetch the most recent post, then the prev, then the next should match the first', function (done) {
        function createFilter(publishedAt, op) {
            // This line deliberately uses double quotes because GQL cannot handle either double quotes
            // or escaped singles, see TryGhost/GQL#34
            return encodeURIComponent("published_at:" + op + "'" + publishedAt + "'");
        }

        request
            .get(localUtils.API.getApiQuery(
                'posts/?client_id=ghost-admin&client_secret=not_available&limit=1'
            ))
            .set('Origin', testUtils.API.getURL())
            .expect('Content-Type', /json/)
            .expect('Cache-Control', testUtils.cacheRules.private)
            .expect(200)
            .then(function (res) {
                should.exist(res.body.posts[0]);
                var post = res.body.posts[0],
                    publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');

                post.title.should.eql('Welcome to Ghost');

                return request
                    .get(localUtils.API.getApiQuery(
                        'posts/?client_id=ghost-admin&client_secret=not_available&limit=1&filter='
                        + createFilter(publishedAt, '<')
                    ))
                    .set('Origin', testUtils.API.getURL())
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then(function (res) {
                should.exist(res.body.posts[0]);
                var post = res.body.posts[0],
                    publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');

                post.title.should.eql('Writing posts with Ghost ✍️');

                return request
                    .get(localUtils.API.getApiQuery(
                        'posts/?client_id=ghost-admin&client_secret=not_available&limit=1&filter='
                        + createFilter(publishedAt, '>')
                    ))
                    .set('Origin', testUtils.API.getURL())
                    .expect('Content-Type', /json/)
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(200);
            })
            .then(function (res) {
                should.exist(res.body.posts[0]);
                var post = res.body.posts[0];

                post.title.should.eql('Welcome to Ghost');

                done();
            })
            .catch(done);
    });
});

