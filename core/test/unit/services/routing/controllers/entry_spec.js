const should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../../../utils'),
    filters = require('../../../../../server/filters'),
    urlService = require('../../../../../server/services/url'),
    controllers = require('../../../../../server/services/routing/controllers'),
    helpers = require('../../../../../server/services/routing/helpers'),
    sandbox = sinon.sandbox.create(),
    EDITOR_URL = '/editor/';

describe('Unit - services/routing/controllers/entry', function () {
    let req, res, postLookUpStub, secureStub, renderStub, post, page;

    beforeEach(function () {
        post = testUtils.DataGenerator.forKnex.createPost();
        post.url = '/does-exist/';

        page = testUtils.DataGenerator.forKnex.createPost({page: 1});

        secureStub = sandbox.stub();
        postLookUpStub = sandbox.stub();
        renderStub = sandbox.stub();

        sandbox.stub(helpers, 'postLookup').get(function () {
            return postLookUpStub;
        });

        sandbox.stub(helpers, 'secure').get(function () {
            return secureStub;
        });

        sandbox.stub(helpers, 'renderEntry').get(function () {
            return renderStub;
        });

        sandbox.stub(filters, 'doFilter');

        sandbox.stub(urlService.utils, 'redirectToAdmin');
        sandbox.stub(urlService.utils, 'redirect301');
        sandbox.stub(urlService, 'getResource');

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

    it('resource not found', function (done) {
        req.path = '/does-not-exist/';

        postLookUpStub.withArgs(req.path, res.locals.routerOptions)
            .resolves(null);

        controllers.entry(req, res, function (err) {
            should.not.exist(err);
            done();
        });
    });

    it('resource found', function (done) {
        req.path = post.url;
        req.originalUrl = req.path;

        res.locals.routerOptions.type = 'posts';

        filters.doFilter.withArgs('prePostsRender', post, res.locals).resolves();

        urlService.getResource.withArgs(post.url).returns({
            config: {
                type: 'posts'
            }
        });

        postLookUpStub.withArgs(req.path, res.locals.routerOptions)
            .resolves({
                post: post
            });

        renderStub.callsFake(function () {
            secureStub.calledOnce.should.be.true();
            done();
        });

        controllers.entry(req, res);
    });

    describe('[edge cases] resource found', function () {
        it('isUnknownOption: true', function (done) {
            req.path = post.url;

            postLookUpStub.withArgs(req.path, res.locals.routerOptions)
                .resolves({
                    isUnknownOption: true,
                    post: post
                });

            controllers.entry(req, res, function (err) {
                should.not.exist(err);
                done();
            });
        });

        it('isEditURL: true', function (done) {
            req.path = post.url;

            postLookUpStub.withArgs(req.path, res.locals.routerOptions)
                .resolves({
                    isEditURL: true,
                    post: post
                });

            urlService.utils.redirectToAdmin.callsFake(function (statusCode, res, editorUrl) {
                statusCode.should.eql(302);
                editorUrl.should.eql(EDITOR_URL + post.id);
                done();
            });

            controllers.entry(req, res);
        });

        it('type of router !== type of resource', function (done) {
            req.path = post.url;
            res.locals.routerOptions.type = 'posts';

            urlService.getResource.withArgs(post.url).returns({
                config: {
                    type: 'pages'
                }
            });

            postLookUpStub.withArgs(req.path, res.locals.routerOptions)
                .resolves({
                    post: post
                });

            controllers.entry(req, res, function (err) {
                should.not.exist(err);
                done();
            });
        });

        it('requested url !== resource url', function (done) {
            post.url = '/2017/08/' + post.url;
            req.path = '/2017/07/' + post.url;
            req.originalUrl = req.path;

            res.locals.routerOptions.type = 'posts';

            urlService.getResource.withArgs(post.url).returns({
                config: {
                    type: 'posts'
                }
            });

            postLookUpStub.withArgs(req.path, res.locals.routerOptions)
                .resolves({
                    post: post
                });

            urlService.utils.redirect301.callsFake(function (res, postUrl) {
                postUrl.should.eql(post.url);
                done();
            });

            controllers.entry(req, res);
        });
    });
});
