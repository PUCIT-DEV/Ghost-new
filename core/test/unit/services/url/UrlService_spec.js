'use strict';

// jshint unused: false
const _ = require('lodash');
const Promise = require('bluebird');
const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/configUtils');
const models = require('../../../../server/models');
const common = require('../../../../server/lib/common');
const UrlService = require('../../../../server/services/url/UrlService');
const sandbox = sinon.sandbox.create();

describe('Unit: services/url/UrlService', function () {
    let knexMock, urlService;

    before(function () {
        models.init();

        // @NOTE: we auto create a singleton - as soon as you require the file, it will listen on events
        require('../../../../server/services/url').reset();
    });

    beforeEach(function () {
        knexMock = new testUtils.mocks.knex();
        knexMock.mock();
    });

    afterEach(function () {
        sandbox.restore();
    });

    afterEach(function () {
        knexMock.unmock();
    });

    after(function () {
        sandbox.restore();
    });

    describe('functional: default routing set', function () {
        let routingType1, routingType2, routingType3, routingType4;

        beforeEach(function (done) {
            urlService = new UrlService();

            routingType1 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'post collection';
                }
            };

            routingType2 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'authors';
                }
            };

            routingType3 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'tags';
                }
            };

            routingType4 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'static pages';
                }
            };

            routingType1.getFilter.returns('featured:false');
            routingType1.getType.returns('posts');
            routingType1.getPermalinks.returns({
                getValue: function () {
                    return '/:slug/';
                }
            });

            routingType2.getFilter.returns(false);
            routingType2.getType.returns('users');
            routingType2.getPermalinks.returns({
                getValue: function () {
                    return '/author/:slug/';
                }
            });

            routingType3.getFilter.returns(false);
            routingType3.getType.returns('tags');
            routingType3.getPermalinks.returns({
                getValue: function () {
                    return '/tag/:slug/';
                }
            });

            routingType4.getFilter.returns(false);
            routingType4.getType.returns('pages');
            routingType4.getPermalinks.returns({
                getValue: function () {
                    return '/:slug/';
                }
            });

            common.events.emit('routingType.created', routingType1);
            common.events.emit('routingType.created', routingType2);
            common.events.emit('routingType.created', routingType3);
            common.events.emit('routingType.created', routingType4);

            common.events.emit('db.ready');

            let timeout;
            (function retry() {
                clearTimeout(timeout);

                if (urlService.hasFinished()) {
                    return done();
                }

                setTimeout(retry, 50);
            })();
        });

        afterEach(function () {
            urlService.reset();
        });

        it('check url generators', function () {
            urlService.urlGenerators.length.should.eql(4);
            urlService.urlGenerators[0].routingType.should.eql(routingType1);
            urlService.urlGenerators[1].routingType.should.eql(routingType2);
            urlService.urlGenerators[2].routingType.should.eql(routingType3);
            urlService.urlGenerators[3].routingType.should.eql(routingType4);
        });

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.routingType.getType() === 'posts') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.routingType.getType() === 'pages') {
                    generator.getUrls().length.should.eql(1);
                }

                if (generator.routingType.getType() === 'tags') {
                    generator.getUrls().length.should.eql(5);
                }

                if (generator.routingType.getType() === 'users') {
                    generator.getUrls().length.should.eql(5);
                }
            });

            let url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[0].id);
            url.should.eql('/html-ipsum/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[1].id);
            url.should.eql('/ghostly-kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[2].id);
            should.not.exist(url);

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[0].id);
            url.should.eql('/tag/kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[1].id);
            url.should.eql('/tag/bacon/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[2].id);
            url.should.eql('/tag/chorizo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[3].id);
            url.should.eql('/tag/pollo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[4].id);
            url.should.eql('/tag/injection/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[0].id);
            url.should.eql('/author/joe-bloggs/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[1].id);
            url.should.eql('/author/smith-wellingsworth/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[2].id);
            url.should.eql('/author/jimothy-bogendath/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[3].id);
            url.should.eql('/author/slimer-mcectoplasm/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[4].id);
            url.should.eql('/author/contributor/');
        });

        it('getResource', function () {
            let resource = urlService.getResource('/html-ipsum/');
            resource.data.id.should.eql(testUtils.DataGenerator.forKnex.posts[0].id);

            resource = urlService.getResource('/does-not-exist/');
            should.not.exist(resource);
        });

        describe('update resource', function () {
            it('featured: false => featured:true', function () {
                return models.Post.edit({featured: true}, {id: testUtils.DataGenerator.forKnex.posts[1].id})
                    .then(function (post) {
                        // There is no collection which owns featured posts.
                        let url = urlService.getUrlByResourceId(post.id);
                        should.not.exist(url);

                        urlService.urlGenerators.forEach(function (generator) {
                            if (generator.routingType.getType() === 'posts') {
                                generator.getUrls().length.should.eql(1);
                            }

                            if (generator.routingType.getType() === 'pages') {
                                generator.getUrls().length.should.eql(1);
                            }
                        });
                    });
            });

            it('page: false => page:true', function () {
                return models.Post.edit({page: true}, {id: testUtils.DataGenerator.forKnex.posts[1].id})
                    .then(function (post) {
                        let url = urlService.getUrlByResourceId(post.id);

                        url.should.eql('/ghostly-kitchen-sink/');

                        urlService.urlGenerators.forEach(function (generator) {
                            if (generator.routingType.getType() === 'posts') {
                                generator.getUrls().length.should.eql(1);
                            }

                            if (generator.routingType.getType() === 'pages') {
                                generator.getUrls().length.should.eql(2);
                            }
                        });
                    });
            });

            it('page: true => page:false', function () {
                return models.Post.edit({page: false}, {id: testUtils.DataGenerator.forKnex.posts[5].id})
                    .then(function (post) {
                        let url = urlService.getUrlByResourceId(post.id);

                        url.should.eql('/static-page-test/');

                        urlService.urlGenerators.forEach(function (generator) {
                            if (generator.routingType.getType() === 'posts') {
                                generator.getUrls().length.should.eql(3);
                            }

                            if (generator.routingType.getType() === 'pages') {
                                generator.getUrls().length.should.eql(0);
                            }
                        });
                    });
            });
        });

        describe('add new resource', function () {
            it('already published', function () {
                return models.Post.add({
                    featured: false,
                    page: false,
                    status: 'published',
                    title: 'Brand New Story!',
                    author_id: testUtils.DataGenerator.forKnex.users[4].id
                }).then(function (post) {
                    let url = urlService.getUrlByResourceId(post.id);
                    url.should.eql('/brand-new-story/');

                    let resource = urlService.getResource(url);
                    resource.data.primary_author.id.should.eql(testUtils.DataGenerator.forKnex.users[4].id);
                });
            });

            it('draft', function () {
                return models.Post.add({
                    featured: false,
                    page: false,
                    status: 'draft',
                    title: 'Brand New Story!',
                    author_id: testUtils.DataGenerator.forKnex.users[4].id
                }).then(function (post) {
                    let url = urlService.getUrlByResourceId(post.id);
                    should.not.exist(url);

                    let resource = urlService.getResource(url);
                    should.not.exist(resource);
                });
            });
        });
    });

    describe('functional: extended/modified routing set', function () {
        let routingType1, routingType2, routingType3, routingType4, routingType5;

        beforeEach(function (done) {
            urlService = new UrlService();

            routingType1 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'post collection 1';
                }
            };

            routingType2 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'post collection 2';
                }
            };

            routingType3 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'authors';
                }
            };

            routingType4 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'tags';
                }
            };

            routingType5 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'static pages';
                }
            };

            routingType1.getFilter.returns('featured:false');
            routingType1.getType.returns('posts');
            routingType1.getPermalinks.returns({
                getValue: function () {
                    return '/collection/:year/:slug/';
                }
            });

            routingType2.getFilter.returns('featured:true');
            routingType2.getType.returns('posts');
            routingType2.getPermalinks.returns({
                getValue: function () {
                    return '/podcast/:slug/';
                }
            });

            routingType3.getFilter.returns(false);
            routingType3.getType.returns('users');
            routingType3.getPermalinks.returns({
                getValue: function () {
                    return '/persons/:slug/';
                }
            });

            routingType4.getFilter.returns(false);
            routingType4.getType.returns('tags');
            routingType4.getPermalinks.returns({
                getValue: function () {
                    return '/category/:slug/';
                }
            });

            routingType5.getFilter.returns(false);
            routingType5.getType.returns('pages');
            routingType5.getPermalinks.returns({
                getValue: function () {
                    return '/:slug/';
                }
            });

            common.events.emit('routingType.created', routingType1);
            common.events.emit('routingType.created', routingType2);
            common.events.emit('routingType.created', routingType3);
            common.events.emit('routingType.created', routingType4);
            common.events.emit('routingType.created', routingType5);

            common.events.emit('db.ready');

            let timeout;
            (function retry() {
                clearTimeout(timeout);

                if (urlService.hasFinished()) {
                    return done();
                }

                setTimeout(retry, 50);
            })();
        });

        afterEach(function () {
            urlService.reset();
        });

        it('check url generators', function () {
            urlService.urlGenerators.length.should.eql(5);
            urlService.urlGenerators[0].routingType.should.eql(routingType1);
            urlService.urlGenerators[1].routingType.should.eql(routingType2);
            urlService.urlGenerators[2].routingType.should.eql(routingType3);
            urlService.urlGenerators[3].routingType.should.eql(routingType4);
            urlService.urlGenerators[4].routingType.should.eql(routingType5);
        });

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.routingType.getType() === 'posts' && generator.routingType.getFilter() === 'featured:false') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.routingType.getType() === 'posts' && generator.routingType.getFilter() === 'featured:true') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.routingType.getType() === 'pages') {
                    generator.getUrls().length.should.eql(1);
                }

                if (generator.routingType.getType() === 'tags') {
                    generator.getUrls().length.should.eql(5);
                }

                if (generator.routingType.getType() === 'users') {
                    generator.getUrls().length.should.eql(5);
                }
            });

            let url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[0].id);
            url.should.eql('/collection/2015/html-ipsum/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[1].id);
            url.should.eql('/collection/2015/ghostly-kitchen-sink/');

            // featured
            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[2].id);
            url.should.eql('/podcast/short-and-sweet/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[0].id);
            url.should.eql('/category/kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[1].id);
            url.should.eql('/category/bacon/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[2].id);
            url.should.eql('/category/chorizo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[3].id);
            url.should.eql('/category/pollo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[4].id);
            url.should.eql('/category/injection/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[0].id);
            url.should.eql('/persons/joe-bloggs/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[1].id);
            url.should.eql('/persons/smith-wellingsworth/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[2].id);
            url.should.eql('/persons/jimothy-bogendath/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[3].id);
            url.should.eql('/persons/slimer-mcectoplasm/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[4].id);
            url.should.eql('/persons/contributor/');
        });

        describe('update resource', function () {
            it('featured: false => featured:true', function () {
                return models.Post.edit({featured: true}, {id: testUtils.DataGenerator.forKnex.posts[1].id})
                    .then(function (post) {
                        // There is no collection which owns featured posts.
                        let url = urlService.getUrlByResourceId(post.id);
                        url.should.eql('/podcast/ghostly-kitchen-sink/');

                        urlService.urlGenerators.forEach(function (generator) {
                            if (generator.routingType.getType() === 'posts' && generator.routingType.getFilter() === 'featured:false') {
                                generator.getUrls().length.should.eql(1);
                            }

                            if (generator.routingType.getType() === 'posts' && generator.routingType.getFilter() === 'featured:true') {
                                generator.getUrls().length.should.eql(3);
                            }
                        });
                    });
            });

            it('featured: true => featured:false', function () {
                return models.Post.edit({featured: false}, {id: testUtils.DataGenerator.forKnex.posts[2].id})
                    .then(function (post) {
                        // There is no collection which owns featured posts.
                        let url = urlService.getUrlByResourceId(post.id);
                        url.should.eql('/collection/2015/short-and-sweet/');

                        urlService.urlGenerators.forEach(function (generator) {
                            if (generator.routingType.getType() === 'posts' && generator.routingType.getFilter() === 'featured:false') {
                                generator.getUrls().length.should.eql(3);
                            }

                            if (generator.routingType.getType() === 'posts' && generator.routingType.getFilter() === 'featured:true') {
                                generator.getUrls().length.should.eql(1);
                            }
                        });
                    });
            });
        });
    });

    describe('functional: subdirectory', function () {
        let routingType1, routingType2, routingType3, routingType4, routingType5;

        beforeEach(function (done) {
            configUtils.set('url', 'http://localhost:2388/blog');

            urlService = new UrlService();

            routingType1 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'post collection 1';
                }
            };

            routingType2 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'post collection 2';
                }
            };

            routingType3 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'authors';
                }
            };

            routingType4 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'tags';
                }
            };

            routingType5 = {
                getFilter: sandbox.stub(),
                addListener: sandbox.stub(),
                getType: sandbox.stub(),
                getPermalinks: sandbox.stub(),
                toString: function () {
                    return 'static pages';
                }
            };

            routingType1.getFilter.returns('featured:false');
            routingType1.getType.returns('posts');
            routingType1.getPermalinks.returns({
                getValue: function () {
                    return '/collection/:year/:slug/';
                }
            });

            routingType2.getFilter.returns('featured:true');
            routingType2.getType.returns('posts');
            routingType2.getPermalinks.returns({
                getValue: function () {
                    return '/podcast/:slug/';
                }
            });

            routingType3.getFilter.returns(false);
            routingType3.getType.returns('users');
            routingType3.getPermalinks.returns({
                getValue: function () {
                    return '/persons/:slug/';
                }
            });

            routingType4.getFilter.returns(false);
            routingType4.getType.returns('tags');
            routingType4.getPermalinks.returns({
                getValue: function () {
                    return '/category/:slug/';
                }
            });

            routingType5.getFilter.returns(false);
            routingType5.getType.returns('pages');
            routingType5.getPermalinks.returns({
                getValue: function () {
                    return '/:slug/';
                }
            });

            common.events.emit('routingType.created', routingType1);
            common.events.emit('routingType.created', routingType2);
            common.events.emit('routingType.created', routingType3);
            common.events.emit('routingType.created', routingType4);
            common.events.emit('routingType.created', routingType5);

            common.events.emit('db.ready');

            let timeout;
            (function retry() {
                clearTimeout(timeout);

                if (urlService.hasFinished()) {
                    return done();
                }

                setTimeout(retry, 50);
            })();
        });

        afterEach(function () {
            urlService.reset();
            configUtils.restore();
        });

        it('check url generators', function () {
            urlService.urlGenerators.length.should.eql(5);
            urlService.urlGenerators[0].routingType.should.eql(routingType1);
            urlService.urlGenerators[1].routingType.should.eql(routingType2);
            urlService.urlGenerators[2].routingType.should.eql(routingType3);
            urlService.urlGenerators[3].routingType.should.eql(routingType4);
            urlService.urlGenerators[4].routingType.should.eql(routingType5);
        });

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.routingType.getType() === 'posts' && generator.routingType.getFilter() === 'featured:false') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.routingType.getType() === 'posts' && generator.routingType.getFilter() === 'featured:true') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.routingType.getType() === 'pages') {
                    generator.getUrls().length.should.eql(1);
                }

                if (generator.routingType.getType() === 'tags') {
                    generator.getUrls().length.should.eql(5);
                }

                if (generator.routingType.getType() === 'users') {
                    generator.getUrls().length.should.eql(5);
                }
            });

            let url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[0].id);
            url.should.eql('/blog/collection/2015/html-ipsum/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[1].id);
            url.should.eql('/blog/collection/2015/ghostly-kitchen-sink/');

            // featured
            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[2].id);
            url.should.eql('/blog/podcast/short-and-sweet/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[0].id);
            url.should.eql('/blog/category/kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[1].id);
            url.should.eql('/blog/category/bacon/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[2].id);
            url.should.eql('/blog/category/chorizo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[3].id);
            url.should.eql('/blog/category/pollo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[4].id);
            url.should.eql('/blog/category/injection/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[0].id);
            url.should.eql('/blog/persons/joe-bloggs/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[1].id);
            url.should.eql('/blog/persons/smith-wellingsworth/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[2].id);
            url.should.eql('/blog/persons/jimothy-bogendath/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[3].id);
            url.should.eql('/blog/persons/slimer-mcectoplasm/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[4].id);
            url.should.eql('/blog/persons/contributor/');
        });
    });
});
