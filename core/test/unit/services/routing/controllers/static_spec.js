const should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../../../utils'),
    api = require('../../../../../server/api'),
    themeService = require('../../../../../server/services/themes'),
    helpers = require('../../../../../server/services/routing/helpers'),
    controllers = require('../../../../../server/services/routing/controllers');

function failTest(done) {
    return function (err) {
        should.exist(err);
        done(err);
    };
}

describe('Unit - services/routing/controllers/static', function () {
    let req, res, secureStub, renderStub, handleErrorStub, formatResponseStub, posts, postsPerPage;

    beforeEach(function () {
        postsPerPage = 5;

        posts = [
            testUtils.DataGenerator.forKnex.createPost()
        ];

        secureStub = sinon.stub();
        renderStub = sinon.stub();
        handleErrorStub = sinon.stub();
        formatResponseStub = sinon.stub();
        formatResponseStub.entries = sinon.stub();

        sinon.stub(api.tags, 'read');

        sinon.stub(helpers, 'secure').get(function () {
            return secureStub;
        });

        sinon.stub(helpers, 'handleError').get(function () {
            return handleErrorStub;
        });

        sinon.stub(themeService, 'getActive').returns({
            config: function (key) {
                if (key === 'posts_per_page') {
                    return postsPerPage;
                }
            }
        });

        sinon.stub(helpers, 'renderer').get(function () {
            return renderStub;
        });

        sinon.stub(helpers, 'formatResponse').get(function () {
            return formatResponseStub;
        });

        req = {
            path: '/',
            params: {},
            route: {}
        };

        res = {
            routerOptions: {},
            render: sinon.spy(),
            redirect: sinon.spy(),
            locals: {
                apiVersion: 'v0.1'
            }
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('no extra data to fetch', function (done) {
        helpers.renderer.callsFake(function () {
            helpers.formatResponse.entries.calledOnce.should.be.true();
            api.tags.read.called.should.be.false();
            helpers.secure.called.should.be.false();
            done();
        });

        controllers.static(req, res, failTest(done));
    });

    it('extra data to fetch', function (done) {
        res.routerOptions.data = {
            tag: {
                controller: 'tags',
                resource: 'tags',
                type: 'read',
                options: {
                    slug: 'bacon'
                }
            }
        };

        api.tags.read.resolves({tags: [{slug: 'bacon'}]});

        helpers.renderer.callsFake(function () {
            api.tags.read.called.should.be.true();
            helpers.formatResponse.entries.calledOnce.should.be.true();
            helpers.secure.calledOnce.should.be.true();
            done();
        });

        controllers.static(req, res, failTest(done));
    });
});
