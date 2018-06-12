const should = require('should'),
    sinon = require('sinon'),
    api = require('../../../../../server/api'),
    urlService = require('../../../../../server/services/url'),
    helpers = require('../../../../../server/services/routing/helpers'),
    testUtils = require('../../../../utils'),
    sandbox = sinon.sandbox.create();

describe('Unit - services/routing/helpers/fetch-data', function () {
    let posts, tags, users;

    beforeEach(function () {
        posts = [
            testUtils.DataGenerator.forKnex.createPost({url: '/a/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/b/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/c/'}),
            testUtils.DataGenerator.forKnex.createPost({url: '/d/'})
        ];

        tags = [
            testUtils.DataGenerator.forKnex.createTag(),
            testUtils.DataGenerator.forKnex.createTag(),
            testUtils.DataGenerator.forKnex.createTag(),
            testUtils.DataGenerator.forKnex.createTag()
        ];

        sandbox.stub(api.posts, 'browse')
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 2
                    }
                }
            });

        sandbox.stub(api.tags, 'read').resolves({tags: tags});

        sandbox.stub(urlService, 'owns');
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should handle no options', function (done) {
        helpers.fetchData().then(function (result) {
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta');
            result.should.not.have.property('data');

            api.posts.browse.calledOnce.should.be.true();
            api.posts.browse.firstCall.args[0].should.be.an.Object();
            api.posts.browse.firstCall.args[0].should.have.property('include');
            api.posts.browse.firstCall.args[0].should.not.have.property('filter');

            done();
        }).catch(done);
    });

    it('should handle path options with page/limit', function (done) {
        helpers.fetchData({page: 2, limit: 10}).then(function (result) {
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta');
            result.should.not.have.property('data');

            result.posts.length.should.eql(posts.length);
            urlService.owns.called.should.be.false();

            api.posts.browse.calledOnce.should.be.true();
            api.posts.browse.firstCall.args[0].should.be.an.Object();
            api.posts.browse.firstCall.args[0].should.have.property('include');
            api.posts.browse.firstCall.args[0].should.have.property('limit', 10);
            api.posts.browse.firstCall.args[0].should.have.property('page', 2);

            done();
        }).catch(done);
    });

    it('should handle multiple queries', function (done) {
        const pathOptions = {};

        const routerOptions = {
            data: {
                featured: {
                    type: 'browse',
                    resource: 'posts',
                    options: {
                        filter: 'featured:true',
                        limit: 3
                    }
                }
            }
        };

        helpers.fetchData(pathOptions, routerOptions).then(function (result) {
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('featured');
            result.data.featured.should.be.an.Object().with.properties('posts', 'meta');
            result.data.featured.should.not.have.properties('data');

            result.posts.length.should.eql(posts.length);
            result.data.featured.posts.length.should.eql(posts.length);
            urlService.owns.called.should.be.false();

            api.posts.browse.calledTwice.should.be.true();
            api.posts.browse.firstCall.args[0].should.have.property('include', 'author,authors,tags');

            api.posts.browse.secondCall.args[0].should.have.property('filter', 'featured:true');
            api.posts.browse.secondCall.args[0].should.have.property('limit', 3);
            done();
        }).catch(done);
    });

    it('should handle multiple queries with page param', function (done) {
        const pathOptions = {
            page: 2
        };

        const routerOptions = {
            data: {
                featured: {
                    type: 'browse',
                    resource: 'posts',
                    options: {filter: 'featured:true', limit: 3}
                }
            }
        };

        helpers.fetchData(pathOptions, routerOptions).then(function (result) {
            should.exist(result);

            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('featured');
            result.data.featured.should.be.an.Object().with.properties('posts', 'meta');
            result.data.featured.should.not.have.properties('data');

            result.posts.length.should.eql(posts.length);
            result.data.featured.posts.length.should.eql(posts.length);
            urlService.owns.called.should.be.false();

            api.posts.browse.calledTwice.should.be.true();
            api.posts.browse.firstCall.args[0].should.have.property('include', 'author,authors,tags');
            api.posts.browse.firstCall.args[0].should.have.property('page', 2);
            api.posts.browse.secondCall.args[0].should.have.property('filter', 'featured:true');
            api.posts.browse.secondCall.args[0].should.have.property('limit', 3);
            done();
        }).catch(done);
    });

    it('should handle queries with slug replacements', function (done) {
        const pathOptions = {
            slug: 'testing'
        };

        const routerOptions = {
            filter: 'tags:%s',
            data: {
                tag: {
                    type: 'read',
                    resource: 'tags',
                    options: {slug: '%s'}
                }
            }
        };

        helpers.fetchData(pathOptions, routerOptions).then(function (result) {
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta', 'data');
            result.data.should.be.an.Object().with.properties('tag');

            result.posts.length.should.eql(posts.length);
            result.data.tag.length.should.eql(tags.length);
            urlService.owns.called.should.be.false();

            api.posts.browse.calledOnce.should.be.true();
            api.posts.browse.firstCall.args[0].should.have.property('include');
            api.posts.browse.firstCall.args[0].should.have.property('filter', 'tags:testing');
            api.posts.browse.firstCall.args[0].should.not.have.property('slug');
            api.tags.read.firstCall.args[0].should.have.property('slug', 'testing');
            done();
        }).catch(done);
    });

    it('should verify if post belongs to collection', function (done) {
        const pathOptions = {};

        const routerOptions = {
            identifier: 'identifier',
            filter: 'featured:true'
        };

        urlService.owns.withArgs('identifier', posts[0].url).returns(false);
        urlService.owns.withArgs('identifier', posts[1].url).returns(true);
        urlService.owns.withArgs('identifier', posts[2].url).returns(false);
        urlService.owns.withArgs('identifier', posts[3].url).returns(false);

        helpers.fetchData(pathOptions, routerOptions).then(function (result) {
            should.exist(result);
            result.should.be.an.Object().with.properties('posts', 'meta');

            result.posts.length.should.eql(1);
            urlService.owns.callCount.should.eql(4);

            api.posts.browse.calledOnce.should.be.true();
            api.posts.browse.firstCall.args[0].should.have.property('include');
            api.posts.browse.firstCall.args[0].should.have.property('filter', 'featured:true');
            done();
        }).catch(done);
    });
});
