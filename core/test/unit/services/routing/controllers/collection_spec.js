const should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../../../utils'),
    common = require('../../../../../server/lib/common'),
    security = require('../../../../../server/lib/security'),
    filters = require('../../../../../server/filters'),
    themeService = require('../../../../../server/services/themes'),
    urlService = require('../../../../../server/services/url'),
    controllers = require('../../../../../server/services/routing/controllers'),
    helpers = require('../../../../../server/services/routing/helpers'),
    sandbox = sinon.sandbox.create();

function failTest(done) {
    return function (err) {
        should.exist(err);
        done(err);
    };
}

describe('Unit - services/routing/controllers/collection', function () {
    let req, res, fetchDataStub, secureStub, renderStub, posts, postsPerPage;

    beforeEach(function () {
        postsPerPage = 5;

        posts = [
            testUtils.DataGenerator.forKnex.createPost()
        ];

        secureStub = sandbox.stub();
        fetchDataStub = sandbox.stub();
        renderStub = sandbox.stub();

        sandbox.stub(helpers, 'fetchData').get(function () {
            return fetchDataStub;
        });

        sandbox.stub(security.string, 'safe').returns('safe');

        sandbox.stub(helpers, 'secure').get(function () {
            return secureStub;
        });

        sandbox.stub(themeService, 'getActive').returns({
            config: function (key) {
               key.should.eql('posts_per_page');
               return postsPerPage;
           }
        });

        sandbox.stub(helpers, 'renderCollection').get(function () {
            return renderStub;
        });

        sandbox.stub(filters, 'doFilter');

        req = {
            path: '/',
            params: {},
            route: {}
        };

        res = {
            locals: {
                routerOptions: {}
            },
            render: sinon.spy(),
            redirect: sinon.spy()
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('no params', function (done) {
        fetchDataStub.withArgs({page: 1, slug: undefined, limit: postsPerPage}, res.locals.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        filters.doFilter.withArgs('prePostsRender', posts, res.locals).resolves();

        renderStub.callsFake(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            filters.doFilter.calledOnce.should.be.true();
            secureStub.calledOnce.should.be.true();
            done();
        });

        controllers.collection(req, res, failTest(done));
    });

    it('pass page param', function (done) {
        req.params.page = 2;

        fetchDataStub.withArgs({page: 2, slug: undefined, limit: postsPerPage}, res.locals.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        filters.doFilter.withArgs('prePostsRender', posts, res.locals).resolves();

        renderStub.callsFake(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            filters.doFilter.calledOnce.should.be.true();
            secureStub.calledOnce.should.be.true();
            done();
        });

        controllers.collection(req, res, failTest(done));
    });

    it('page param too big', function (done) {
        req.params.page = 6;

        fetchDataStub.withArgs({page: 6, slug: undefined, limit: postsPerPage}, res.locals.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        controllers.collection(req, res, function (err) {
            (err instanceof common.errors.NotFoundError).should.be.true();

            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            filters.doFilter.calledOnce.should.be.false();
            renderStub.calledOnce.should.be.false();
            secureStub.calledOnce.should.be.false();

            done();
        });
    });

    it('slug param', function (done) {
        req.params.slug = 'unsafe';

        fetchDataStub.withArgs({page: 1, slug: 'safe', limit: postsPerPage}, res.locals.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        filters.doFilter.withArgs('prePostsRender', posts, res.locals).resolves();

        renderStub.callsFake(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.true();
            fetchDataStub.calledOnce.should.be.true();
            filters.doFilter.calledOnce.should.be.true();
            secureStub.calledOnce.should.be.true();
            done();
        });

        controllers.collection(req, res, failTest(done));
    });

    it('invalid posts per page', function (done) {
        postsPerPage = -1;

        fetchDataStub.withArgs({page: 1, slug: undefined}, res.locals.routerOptions)
            .resolves({
                posts: posts,
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        filters.doFilter.withArgs('prePostsRender', posts, res.locals).resolves();

        renderStub.callsFake(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            filters.doFilter.calledOnce.should.be.true();
            secureStub.calledOnce.should.be.true();
            done();
        });

        controllers.collection(req, res, failTest(done));
    });

    it('ensure secure helper get\'s called for data object', function (done) {
        fetchDataStub.withArgs({page: 1, slug: undefined, limit: postsPerPage}, res.locals.routerOptions)
            .resolves({
                posts: posts,
                data: {
                    tag: [testUtils.DataGenerator.forKnex.createTag()]
                },
                meta: {
                    pagination: {
                        pages: 5
                    }
                }
            });

        filters.doFilter.withArgs('prePostsRender', posts, res.locals).resolves();

        renderStub.callsFake(function () {
            themeService.getActive.calledOnce.should.be.true();
            security.string.safe.calledOnce.should.be.false();
            fetchDataStub.calledOnce.should.be.true();
            filters.doFilter.calledOnce.should.be.true();
            secureStub.calledTwice.should.be.true();
            done();
        });

        controllers.collection(req, res, failTest(done));
    });
});
