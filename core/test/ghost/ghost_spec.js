/*globals describe, beforeEach, it*/
var should = require('should'),
    when = require('when'),
    sinon = require('sinon'),
    path = require('path'),
    _ = require('underscore'),
    Ghost = require('../../ghost');

describe("Ghost API", function () {
    var testTemplatePath = 'core/test/ghost/fixtures/',
        ghost;

    beforeEach(function () {
        ghost = new Ghost();
    });

    it("is a singleton", function () {
        var logStub = sinon.stub(console, "log"),
            ghost1 = new Ghost(),
            ghost2 = new Ghost();

        should.strictEqual(ghost1, ghost2);
        logStub.restore();
    });

    it("uses init() to initialize", function (done) {
        var fakeDataProvider = {
                init: function () {
                    return when.resolve();
                }
            },
            dataProviderInitSpy = sinon.spy(fakeDataProvider, "init"),
            oldDataProvider = ghost.dataProvider;

        ghost.dataProvider = fakeDataProvider;

        should.not.exist(ghost.settings());

        ghost.init().then(function () {

            should.exist(ghost.settings());

            dataProviderInitSpy.called.should.equal(true);

            ghost.dataProvider = oldDataProvider;

            done();
        }, done);

    });

    it("can register filters with specific priority", function () {
        var filterName = 'test',
            filterPriority = 9,
            testFilterHandler = sinon.spy();

        ghost.registerFilter(filterName, filterPriority, testFilterHandler);

        should.exist(ghost.filterCallbacks[filterName]);
        should.exist(ghost.filterCallbacks[filterName][filterPriority]);

        ghost.filterCallbacks[filterName][filterPriority].should.include(testFilterHandler);
    });

    it("can register filters with default priority", function () {
        var filterName = 'test',
            defaultPriority = 5,
            testFilterHandler = sinon.spy();

        ghost.registerFilter(filterName, testFilterHandler);

        should.exist(ghost.filterCallbacks[filterName]);
        should.exist(ghost.filterCallbacks[filterName][defaultPriority]);

        ghost.filterCallbacks[filterName][defaultPriority].should.include(testFilterHandler);
    });

    it("executes filters in priority order", function (done) {
        var filterName = 'testpriority',
            testFilterHandler1 = sinon.spy(),
            testFilterHandler2 = sinon.spy(),
            testFilterHandler3 = sinon.spy();

        ghost.registerFilter(filterName, 0, testFilterHandler1);
        ghost.registerFilter(filterName, 2, testFilterHandler2);
        ghost.registerFilter(filterName, 9, testFilterHandler3);

        ghost.doFilter(filterName, null, function () {

            testFilterHandler1.calledBefore(testFilterHandler2).should.equal(true);
            testFilterHandler2.calledBefore(testFilterHandler3).should.equal(true);

            testFilterHandler3.called.should.equal(true);

            done();
        });
    });

    it("can compile a template", function (done) {
        var template = path.join(process.cwd(), testTemplatePath, 'test.hbs');

        should.exist(ghost.compileTemplate, 'Template Compiler exists');

        ghost.compileTemplate(template).then(function (templateFn) {
            should.exist(templateFn);
            _.isFunction(templateFn).should.equal(true);

            templateFn().should.equal('<h1>HelloWorld</h1>');
            done();
        }, done);
    });

    it("loads templates for helpers", function (done) {
        var compileSpy = sinon.spy(ghost, 'compileTemplate');

        should.exist(ghost.loadTemplate, 'load template function exists');

        // In order for the test to work, need to replace the path to the template
        ghost.paths = sinon.stub().returns({
            frontendViews: path.join(process.cwd(), testTemplatePath)
        });

        ghost.loadTemplate('test').then(function (templateFn) {
            // test that compileTemplate was called with the expected path
            compileSpy.calledOnce.should.equal(true);
            compileSpy.calledWith(path.join(process.cwd(), testTemplatePath, 'test.hbs')).should.equal(true);

            should.exist(templateFn);
            _.isFunction(templateFn).should.equal(true);

            templateFn().should.equal('<h1>HelloWorld</h1>');

            compileSpy.restore();

            done();
        }, done);
    });
});