var should = require('should'),
    sinon = require('sinon'),
    proxyquire = require('proxyquire'),
    sandbox = sinon.sandbox.create();

describe('parent app', function () {
    let expressStub;
    let use;
    let apiV01Spy;
    let apiContentV2Spy;
    let apiAdminV2Spy;
    let parentApp;
    let adminSpy;
    let siteSpy;

    beforeEach(function () {
        use = sandbox.spy();
        expressStub = () => ({
            use,
            enable: () => {}
        });

        apiV01Spy = sinon.spy();
        apiContentV2Spy = sinon.spy();
        apiAdminV2Spy = sinon.spy();
        adminSpy = sinon.spy();
        siteSpy = sinon.spy();

        parentApp = proxyquire('../../../server/web/parent-app', {
            express: expressStub,
            './api/v0.1/app': apiV01Spy,
            './api/v2/content/app': apiContentV2Spy,
            './api/v2/admin/app': apiAdminV2Spy,
            './admin': adminSpy,
            './site': siteSpy
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should mount 5 apps and assign correct routes to them', function () {
        parentApp();

        use.calledWith('/ghost/api/v0.1/').should.be.true();
        use.calledWith('/ghost/api/v2/content/').should.be.true();
        use.calledWith('/ghost/api/v2/admin/').should.be.true();
        use.calledWith('/ghost').should.be.true();

        apiV01Spy.called.should.be.true();
        apiContentV2Spy.called.should.be.true();
        apiAdminV2Spy.called.should.be.true();
        adminSpy.called.should.be.true();
        siteSpy.called.should.be.true();
    });
});
