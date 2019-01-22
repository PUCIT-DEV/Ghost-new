// # Dynamic Routing Tests
// As it stands, these tests depend on the database, and as such are integration tests.
// These tests are here to cover the headers sent with requests and high-level redirects that can't be
// tested with the unit tests
const should = require('should'),
    supertest = require('supertest'),
    sinon = require('sinon'),
    moment = require('moment'),
    path = require('path'),
    testUtils = require('../../utils'),
    cheerio = require('cheerio'),
    config = require('../../../server/config'),
    api = require('../../../server/api'),
    settingsCache = require('../../../server/services/settings/cache'),
    ghost = testUtils.startGhost;

let request;

describe('Dynamic Routing', function () {
    let ghostServer;

    function doEnd(done) {
        return function (err, res) {
            if (err) {
                return done(err);
            }

            should.not.exist(res.headers['x-cache-invalidate']);
            should.not.exist(res.headers['X-CSRF-Token']);
            should.not.exist(res.headers['set-cookie']);
            should.exist(res.headers.date);

            done();
        };
    }

    before(function () {
        // Default is always casper. We use the old compatible 1.4 casper theme for these tests. Available in the test content folder.
        var originalSettingsCacheGetFn = settingsCache.get;
        sinon.stub(settingsCache, 'get').callsFake(function (key, options) {
            if (key === 'active_theme') {
                return 'casper-1.4';
            }

            return originalSettingsCacheGetFn(key, options);
        });

        return ghost()
            .then(function (_ghostServer) {
                ghostServer = _ghostServer;
                request = supertest.agent(config.get('url'));
            });
    });

    after(function () {
        sinon.restore();
    });

    describe('Collection Index', function () {
        it('should respond with html', function (done) {
            request.get('/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var $ = cheerio.load(res.text);

                    should.not.exist(res.headers['x-cache-invalidate']);
                    should.not.exist(res.headers['X-CSRF-Token']);
                    should.not.exist(res.headers['set-cookie']);
                    should.exist(res.headers.date);

                    $('title').text().should.equal('Ghost');
                    $('.content .post').length.should.equal(5);
                    $('.poweredby').text().should.equal('Proudly published with Ghost');
                    $('body.home-template').length.should.equal(1);
                    $('article.post').length.should.equal(5);
                    $('article.tag-getting-started').length.should.equal(5);

                    done();
                });
        });

        it('should not have a third page', function (done) {
            request.get('/page/3/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });

        describe('RSS', function () {
            before(testUtils.teardown);

            before(function (done) {
                testUtils.initData().then(function () {
                    return testUtils.fixtures.overrideOwnerUser();
                }).then(function () {
                    done();
                });
            });

            after(testUtils.teardown);

            it('should 301 redirect with CC=1year without slash', function (done) {
                request.get('/rss')
                    .expect('Location', '/rss/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should respond with 200 & CC=public', function (done) {
                request.get('/rss/')
                    .expect('Content-Type', 'text/xml; charset=utf-8')
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(function (err, res) {
                        if (err) {
                            return done(err);
                        }

                        should.not.exist(res.headers['x-cache-invalidate']);
                        should.not.exist(res.headers['X-CSRF-Token']);
                        should.not.exist(res.headers['set-cookie']);
                        should.exist(res.headers.date);
                        // The remainder of the XML is tested in the unit/xml_spec.js
                        res.text.should.match(/^<\?xml version="1.0" encoding="UTF-8"\?><rss/);

                        done();
                    });
            });

            it('should get 301 redirect with CC=1year to /rss/ from /feed/', function (done) {
                request.get('/feed/')
                    .expect('Location', '/rss/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });
        });

        describe.skip('Paged', function () {
            // Inserting more posts takes a bit longer
            this.timeout(20000);

            // Add enough posts to trigger pages for both the index (25 pp) and rss (15 pp)
            before(function (done) {
                testUtils.initData().then(function () {
                    return testUtils.fixtures.insertPostsAndTags();
                }).then(function () {
                    return testUtils.fixtures.insertExtraPosts(25);
                }).then(function () {
                    done();
                }).catch(done);
            });

            after(testUtils.teardown);

            it('should redirect without slash', function (done) {
                request.get('/page/2')
                    .expect('Location', '/page/2/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should respond with html', function (done) {
                request.get('/page/2/')
                    .expect('Content-Type', /html/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(doEnd(done));
            });

            it('should not allow chars after the page number', function (done) {
                request.get('/page/2abc/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should redirect page 1', function (done) {
                request.get('/page/1/')
                    .expect('Location', '/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should 404 if page too high', function (done) {
                // We have 7 default welcome posts + 8 fixture posts + 25 more posts = 40 (5 pages per post is default). So the 9th page 404's.
                request.get('/page/9/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 if page is zero', function (done) {
                request.get('/page/0/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 if page is less than zero', function (done) {
                request.get('/page/-5/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 if page is NaN', function (done) {
                request.get('/page/one/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            describe('RSS', function () {
                it('should redirect without slash', function (done) {
                    request.get('/rss/2')
                        .expect('Location', '/rss/2/')
                        .expect('Cache-Control', testUtils.cacheRules.year)
                        .expect(301)
                        .end(doEnd(done));
                });

                it('should respond with xml', function (done) {
                    request.get('/rss/2/')
                        .expect('Content-Type', /xml/)
                        .expect('Cache-Control', testUtils.cacheRules.public)
                        .expect(200)
                        .end(doEnd(done));
                });
            });
        });
    });

    describe('Collection Entry', function () {
        before(function () {
            return testUtils.initData().then(function () {
                return testUtils.fixtures.overrideOwnerUser();
            }).then(function () {
                return testUtils.fixtures.insertPostsAndTags();
            });
        });

        it('should render page with slug permalink', function (done) {
            request.get('/static-page-test/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(doEnd(done));
        });

        it('should not render page with dated permalink', function (done) {
            const date = moment().format('YYYY/MM/DD');

            request.get('/' + date + '/static-page-test/')
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .end(doEnd(done));
        });
    });

    describe('Tag', function () {
        before(function (done) {
            testUtils.clearData().then(function () {
                // we initialise data, but not a user. No user should be required for navigating the frontend
                return testUtils.initData();
            }).then(function () {
                return testUtils.fixtures.overrideOwnerUser('ghost-owner');
            }).then(function () {
                done();
            }).catch(done);
        });

        after(testUtils.teardown);

        it('should return HTML for valid route', function (done) {
            request.get('/tag/getting-started/')
                .expect(200)
                .expect('Content-Type', /html/)
                .expect('Content-Type', /html/)
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var $ = cheerio.load(res.text);

                    should.not.exist(res.headers['x-cache-invalidate']);
                    should.not.exist(res.headers['X-CSRF-Token']);
                    should.not.exist(res.headers['set-cookie']);
                    should.exist(res.headers.date);

                    $('body').attr('class').should.eql('tag-template tag-getting-started nav-closed');
                    $('.content .post').length.should.equal(5);
                    $('.poweredby').text().should.equal('Proudly published with Ghost');
                    $('article.post').length.should.equal(5);
                    $('article.tag-getting-started').length.should.equal(5);

                    done();
                });
        });

        it('should 404 for /tag/ route', function (done) {
            request.get('/tag/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });

        it('should 404 for unknown tag', function (done) {
            request.get('/tag/spectacular/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });

        it('should 404 for unknown tag with invalid characters', function (done) {
            request.get('/tag/~$pectacular~/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });

        describe('RSS', function () {
            it('should redirect without slash', function (done) {
                request.get('/tag/getting-started/rss')
                    .expect('Location', '/tag/getting-started/rss/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should respond with xml', function (done) {
                request.get('/tag/getting-started/rss/')
                    .expect('Content-Type', /xml/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(doEnd(done));
            });
        });

        describe('Edit', function () {
            it('should redirect without slash', function (done) {
                request.get('/tag/getting-started/edit')
                    .expect('Location', '/tag/getting-started/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should redirect to tag settings', function (done) {
                request.get('/tag/getting-started/edit/')
                    .expect('Location', '/ghost/#/settings/tags/getting-started/')
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(302)
                    .end(doEnd(done));
            });

            it('should 404 for non-edit parameter', function (done) {
                request.get('/tag/getting-started/notedit/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe.skip('Paged', function () {
            // Inserting more posts takes a bit longer
            this.timeout(20000);

            before(testUtils.teardown);

            // Add enough posts to trigger pages
            before(function (done) {
                testUtils.initData().then(function () {
                    return testUtils.fixtures.insertPostsAndTags();
                }).then(function () {
                    return testUtils.fixtures.insertExtraPosts(11);
                }).then(function () {
                    return testUtils.fixtures.insertExtraPostsTags(11);
                }).then(function () {
                    done();
                }).catch(done);
            });

            after(testUtils.teardown);

            it('should redirect without slash', function (done) {
                request.get('/tag/injection/page/2')
                    .expect('Location', '/tag/injection/page/2/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should respond with html', function (done) {
                request.get('/tag/injection/page/2/')
                    .expect('Content-Type', /html/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(doEnd(done));
            });

            it('should redirect page 1', function (done) {
                request.get('/tag/injection/page/1/')
                    .expect('Location', '/tag/injection/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should 404 if page too high', function (done) {
                request.get('/tag/injection/page/3/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 if page too low', function (done) {
                request.get('/tag/injection/page/0/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            describe('RSS', function () {
                it('should redirect page 1', function (done) {
                    request.get('/tag/getting-started/rss/1/')
                        .expect('Location', '/tag/getting-started/rss/')
                        .expect('Cache-Control', testUtils.cacheRules.year)
                        .expect(301)
                        .end(doEnd(done));
                });

                it('should 404 if page too high', function (done) {
                    request.get('/tag/getting-started/rss/2/')
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(404)
                        .expect(/Page not found/)
                        .end(doEnd(done));
                });

                it('should 404 if page too low', function (done) {
                    request.get('/tag/getting-started/rss/0/')
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(404)
                        .expect(/Page not found/)
                        .end(doEnd(done));
                });
            });
        });
    });

    describe('Author', function () {
        var lockedUser = {
                name: 'Locked so what',
                slug: 'locked-so-what',
                email: 'locked@example.com',
                status: 'locked'
            },
            suspendedUser = {
                name: 'Suspended meeh',
                slug: 'suspended-meeh',
                email: 'suspended@example.com',
                status: 'inactive'
            },
            ownerSlug = 'ghost-owner';

        before(function (done) {
            testUtils.clearData().then(function () {
                // we initialise data, but not a user. No user should be required for navigating the frontend
                return testUtils.initData();
            }).then(function () {
                return testUtils.fixtures.overrideOwnerUser(ownerSlug);
            }).then(function () {
                return testUtils.fixtures.insertOneUser(lockedUser);
            }).then(function () {
                return testUtils.fixtures.insertOneUser(suspendedUser);
            }).then(function () {
                done();
            }).catch(done);
        });

        after(testUtils.teardown);

        it('should 404 for /author/ route', function (done) {
            request.get('/author/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });

        it('should 404 for unknown author', function (done) {
            request.get('/author/spectacular/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });

        it('should 404 for unknown author with invalid characters', function (done) {
            request.get('/author/ghost!user^/')
                .expect('Cache-Control', testUtils.cacheRules.private)
                .expect(404)
                .expect(/Page not found/)
                .end(doEnd(done));
        });

        it('[success] author is locked', function (done) {
            request.get('/author/' + lockedUser.slug + '/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(doEnd(done));
        });

        it('[success] author is suspended', function (done) {
            request.get('/author/' + suspendedUser.slug + '/')
                .expect('Cache-Control', testUtils.cacheRules.public)
                .expect(200)
                .end(doEnd(done));
        });

        it('[failure] ghost owner before blog setup', function (done) {
            testUtils.fixtures.changeOwnerUserStatus({
                slug: ownerSlug,
                status: 'inactive'
            }).then(function () {
                request.get('/author/ghost-owner/')
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(doEnd(done));
            }).catch(done);
        });

        it('[success] ghost owner after blog setup', function (done) {
            testUtils.fixtures.changeOwnerUserStatus({
                slug: ownerSlug,
                status: 'active'
            }).then(function () {
                request.get('/author/ghost-owner/')
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(doEnd(done));
            });
        });

        describe('RSS', function () {
            it('should redirect without slash', function (done) {
                request.get('/author/ghost-owner/rss')
                    .expect('Location', '/author/ghost-owner/rss/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should respond with xml', function (done) {
                request.get('/author/ghost-owner/rss/')
                    .expect('Content-Type', /xml/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(doEnd(done));
            });
        });

        describe('Edit', function () {
            it('should redirect without slash', function (done) {
                request.get('/author/ghost-owner/edit')
                    .expect('Location', '/author/ghost-owner/edit/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should redirect to editor', function (done) {
                request.get('/author/ghost-owner/edit/')
                    .expect('Location', '/ghost/#/team/ghost-owner/')
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(302)
                    .end(doEnd(done));
            });

            it('should 404 for something that isn\'t edit', function (done) {
                request.get('/author/ghost-owner/notedit/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });
        });

        describe('Paged', function () {
            // Add enough posts to trigger pages
            before(function (done) {
                testUtils.clearData().then(function () {
                    // we initialise data, but not a user. No user should be required for navigating the frontend
                    return testUtils.initData();
                }).then(function () {
                    return testUtils.fixtures.insertPostsAndTags();
                }).then(function () {
                    return testUtils.fixtures.insertExtraPosts(9);
                }).then(function () {
                    return testUtils.fixtures.overrideOwnerUser('ghost-owner');
                }).then(function () {
                    done();
                }).catch(done);
            });

            after(testUtils.teardown);

            it('should redirect without slash', function (done) {
                request.get('/author/ghost-owner/page/2')
                    .expect('Location', '/author/ghost-owner/page/2/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should respond with html', function (done) {
                request.get('/author/ghost-owner/page/2/')
                    .expect('Content-Type', /html/)
                    .expect('Cache-Control', testUtils.cacheRules.public)
                    .expect(200)
                    .end(doEnd(done));
            });

            it('should redirect page 1', function (done) {
                request.get('/author/ghost-owner/page/1/')
                    .expect('Location', '/author/ghost-owner/')
                    .expect('Cache-Control', testUtils.cacheRules.year)
                    .expect(301)
                    .end(doEnd(done));
            });

            it('should 404 if page too high', function (done) {
                request.get('/author/ghost-owner/page/6/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            it('should 404 if page too low', function (done) {
                request.get('/author/ghost-owner/page/0/')
                    .expect('Cache-Control', testUtils.cacheRules.private)
                    .expect(404)
                    .expect(/Page not found/)
                    .end(doEnd(done));
            });

            describe('RSS', function () {
                it('should redirect page 1', function (done) {
                    request.get('/author/ghost-owner/rss/1/')
                        .expect('Location', '/author/ghost-owner/rss/')
                        .expect('Cache-Control', testUtils.cacheRules.year)
                        .expect(301)
                        .end(doEnd(done));
                });

                it('should 404 if page too high', function (done) {
                    request.get('/author/ghost-owner/rss/3/')
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(404)
                        .expect(/Page not found/)
                        .end(doEnd(done));
                });

                it('should 404 if page too low', function (done) {
                    request.get('/author/ghost-owner/rss/0/')
                        .expect('Cache-Control', testUtils.cacheRules.private)
                        .expect(404)
                        .expect(/Page not found/)
                        .end(doEnd(done));
                });
            });
        });
    });

    describe('Reload routes.yaml', function () {
        before(function (done) {
            testUtils.clearData().then(function () {
                // we initialise data, but not a user. No user should be required for navigating the frontend
                return testUtils.initData();
            }).then(function () {
                return testUtils.fixtures.overrideOwnerUser('ghost-owner');
            }).then(function () {
                done();
            }).catch(done);
        });

        after(testUtils.teardown);
        after(function () {
            return ghostServer.stop();
        });

        it('confirm current routing pattern', function (done) {
            request.get('/welcome/')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('simulate upload of routes.yaml', function () {
            return api.settings.upload({
                context: testUtils.context.internal.context,
                path: path.join(config.get('paths:appRoot'), 'core', 'test', 'utils', 'fixtures', 'settings', 'newroutes.yaml')
            }).then(() => {
                return testUtils.integrationTesting.urlService.waitTillFinished({dbIsReady: true});
            });
        });

        it('serve welcome post with old permalink structure', function (done) {
            request.get('/welcome/')
                .expect(404)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('serve welcome post with new permalink structure', function (done) {
            const year = moment().year();
            request.get(`/blog/${year}/welcome/`)
                .expect(200)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('serve welcome post with new permalink structure and old date', function (done) {
            request.get('/blog/2016/welcome/')
                .expect(301)
                .end(function (err) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('serve serve rss', function (done) {
            request.get('/blog/rss/')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    const content = res.text;
                    const todayMoment = moment();
                    const year = todayMoment.format('YYYY');
                    const postLink = `/blog/${year}/welcome/`;

                    content.indexOf(postLink).should.be.above(0);

                    done();
                });
        });

        it('serve collection index', function (done) {
            request.get('/blog/')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });

        it('serve tag', function (done) {
            request.get('/category/getting-started/')
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    done();
                });
        });
    });
});
