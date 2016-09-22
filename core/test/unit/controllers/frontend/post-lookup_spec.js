var should         = require('should'),
    sinon          = require('sinon'),
    Promise        = require('bluebird'),
    configUtils    = require('../../../utils/configUtils'),

    // Things we are testing
    api            = require('../../../../server/api'),
    postLookup     = require('../../../../server/controllers/frontend/post-lookup'),

    sandbox = sinon.sandbox.create();

describe('postLookup', function () {
    var postAPIStub;

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    beforeEach(function () {
        postAPIStub = sandbox.stub(api.posts, 'read');
    });

    describe('Permalinks: /:slug/', function () {
        beforeEach(function () {
            configUtils.set({theme: {permalinks: '/:slug/'}});

            postAPIStub.withArgs({slug: 'welcome-to-ghost', include: 'author,tags'})
                .returns(new Promise.resolve({posts: [{
                    url: '/welcome-to-ghost/',
                    published_at: new Date('2016-01-01').valueOf()
                }]}));
        });

        it('can lookup absolute url: /:slug/', function (done) {
            var testUrl = 'http://127.0.0.1:2369/welcome-to-ghost/';

            postLookup(testUrl).then(function (lookup) {
                postAPIStub.calledOnce.should.be.true();
                should.exist(lookup.post);
                lookup.post.should.have.property('url', '/welcome-to-ghost/');
                lookup.isEditURL.should.be.false();
                lookup.isAmpURL.should.be.false();

                done();
            }).catch(done);
        });

        it('can lookup relative url: /:slug/', function (done) {
            var testUrl = '/welcome-to-ghost/';

            postLookup(testUrl).then(function (lookup) {
                postAPIStub.calledOnce.should.be.true();
                should.exist(lookup.post);
                lookup.post.should.have.property('url', '/welcome-to-ghost/');
                lookup.isEditURL.should.be.false();
                lookup.isAmpURL.should.be.false();

                done();
            }).catch(done);
        });

        it('cannot lookup absolute url: /:year/:month/:day/:slug/', function (done) {
            var testUrl = 'http://127.0.0.1:2369/2016/01/01/welcome-to-ghost/';

            postLookup(testUrl).then(function (lookup) {
                should.not.exist(lookup);
                done();
            }).catch(done);
        });

        it('cannot lookup relative url: /:year/:month/:day/:slug/', function (done) {
            var testUrl = '/2016/01/01/welcome-to-ghost/';

            postLookup(testUrl).then(function (lookup) {
                should.not.exist(lookup);
                done();
            }).catch(done);
        });
    });

    describe('Permalinks: /:year/:month/:day/:slug/', function () {
        beforeEach(function () {
            configUtils.set({theme: {permalinks: '/:year/:month/:day/:slug/'}});

            postAPIStub.withArgs({slug: 'welcome-to-ghost', include: 'author,tags'})
                .returns(new Promise.resolve({posts: [{
                    url: '/2016/01/01/welcome-to-ghost/',
                    published_at: new Date('2016-01-01').valueOf()
                }]}));
        });

        it('cannot lookup absolute url: /:slug/', function (done) {
            var testUrl = 'http://127.0.0.1:2369/welcome-to-ghost/';

            postLookup(testUrl).then(function (lookup) {
                should.not.exist(lookup);
                done();
            }).catch(done);
        });

        it('cannot lookup relative url: /:slug/', function (done) {
            var testUrl = '/welcome-to-ghost/';

            postLookup(testUrl).then(function (lookup) {
                should.not.exist(lookup);
                done();
            }).catch(done);
        });

        it('can lookup absolute url: /:year/:month/:day/:slug/', function (done) {
            var testUrl = 'http://127.0.0.1:2369/2016/01/01/welcome-to-ghost/';

            postLookup(testUrl).then(function (lookup) {
                postAPIStub.calledOnce.should.be.true();
                should.exist(lookup.post);
                lookup.post.should.have.property('url', '/2016/01/01/welcome-to-ghost/');
                lookup.isEditURL.should.be.false();
                lookup.isAmpURL.should.be.false();

                done();
            }).catch(done);
        });

        it('can lookup relative url: /:year/:month/:day/:slug/', function (done) {
            var testUrl = '/2016/01/01/welcome-to-ghost/';

            postLookup(testUrl).then(function (lookup) {
                postAPIStub.calledOnce.should.be.true();
                should.exist(lookup.post);
                lookup.post.should.have.property('url', '/2016/01/01/welcome-to-ghost/');
                lookup.isEditURL.should.be.false();
                lookup.isAmpURL.should.be.false();

                done();
            }).catch(done);
        });
    });

    describe('Edit URLs', function () {
        beforeEach(function () {
            configUtils.set({theme: {permalinks: '/:slug/'}});

            postAPIStub.withArgs({slug: 'welcome-to-ghost', include: 'author,tags'})
                .returns(new Promise.resolve({posts: [{
                    url: '/welcome-to-ghost/',
                    published_at: new Date('2016-01-01').valueOf()
                }]}));
        });

        it('can lookup absolute url: /:slug/edit/', function (done) {
            var testUrl = 'http://127.0.0.1:2369/welcome-to-ghost/edit/';

            postLookup(testUrl).then(function (lookup) {
                lookup.post.should.have.property('url', '/welcome-to-ghost/');
                lookup.isEditURL.should.be.true();
                lookup.isAmpURL.should.be.false();
                done();
            }).catch(done);
        });

        it('can lookup relative url: /:slug/edit/', function (done) {
            var testUrl = '/welcome-to-ghost/edit/';

            postLookup(testUrl).then(function (lookup) {
                lookup.post.should.have.property('url', '/welcome-to-ghost/');
                lookup.isEditURL.should.be.true();
                lookup.isAmpURL.should.be.false();
                done();
            }).catch(done);
        });

        it('cannot lookup absolute url: /:year/:month/:day/:slug/edit/', function (done) {
            var testUrl = 'http://127.0.0.1:2369/2016/01/01/welcome-to-ghost/edit/';

            postLookup(testUrl).then(function (lookup) {
                should.not.exist(lookup);
                done();
            }).catch(done);
        });

        it('cannot lookup relative url: /:year/:month/:day/:slug/edit/', function (done) {
            var testUrl = '/2016/01/01/welcome-to-ghost/edit/';

            postLookup(testUrl).then(function (lookup) {
                should.not.exist(lookup);
                done();
            }).catch(done);
        });

        it('cannot lookup relative url: /:slug/notedit/', function (done) {
            var testUrl = '/welcome-to-ghost/notedit/';

            postLookup(testUrl).then(function (lookup) {
                should.not.exist(lookup);
                done();
            }).catch(done);
        });
    });
    describe('AMP URLs', function () {
        beforeEach(function () {
            configUtils.set({theme: {permalinks: '/:slug/'}});

            postAPIStub.withArgs({slug: 'welcome-to-ghost', include: 'author,tags'})
                .returns(new Promise.resolve({posts: [{
                    url: '/welcome-to-ghost/',
                    published_at: new Date('2016-01-01').valueOf()
                }]}));
        });

        it('can lookup absolute url: /:slug/amp/', function (done) {
            var testUrl = 'http://127.0.0.1:2369/welcome-to-ghost/amp/';

            postLookup(testUrl).then(function (lookup) {
                lookup.post.should.have.property('url', '/welcome-to-ghost/');
                lookup.isAmpURL.should.be.true();
                lookup.isEditURL.should.be.false();
                done();
            }).catch(done);
        });

        it('can lookup relative url: /:slug/amp/', function (done) {
            var testUrl = '/welcome-to-ghost/amp/';

            postLookup(testUrl).then(function (lookup) {
                lookup.post.should.have.property('url', '/welcome-to-ghost/');
                lookup.isAmpURL.should.be.true();
                lookup.isEditURL.should.be.false();
                done();
            }).catch(done);
        });

        it('cannot lookup absolute url: /:year/:month/:day/:slug/amp/', function (done) {
            var testUrl = 'http://127.0.0.1:2369/2016/01/01/welcome-to-ghost/amp/';

            postLookup(testUrl).then(function (lookup) {
                should.not.exist(lookup);
                done();
            }).catch(done);
        });

        it('cannot lookup relative url: /:year/:month/:day/:slug/amp/', function (done) {
            var testUrl = '/2016/01/01/welcome-to-ghost/amp/';

            postLookup(testUrl).then(function (lookup) {
                should.not.exist(lookup);
                done();
            }).catch(done);
        });

        it('cannot lookup relative url: /:slug/notamp/', function (done) {
            var testUrl = '/welcome-to-ghost/notamp/';

            postLookup(testUrl).then(function (lookup) {
                should.not.exist(lookup);
                done();
            }).catch(done);
        });
    });
});
