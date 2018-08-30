const should = require('should');
const sinon = require('sinon');
const configUtils = require('../../../../utils/configUtils');
const image = require('../../../../../server/lib/image');
const common = require('../../../../../server/lib/common');
const normalize = require('../../../../../server/web/middleware/image/normalize');

const sandbox = sinon.sandbox.create();

describe('normalize', function () {
    let res, req;

    beforeEach(function () {
        req = {
            file: {
                name: 'test',
                path: '/test/path'
            }
        };

        sandbox.stub(image.manipulator, 'process');
        sandbox.stub(common.logging, 'error');
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    it('should do manipulation by default', function (done) {
        image.manipulator.process.resolves();

        normalize(req, res, () => {
            image.manipulator.process.calledOnce.should.be.true();
            done();
        });
    });

    it('should add files array to request object with original and processed files', function (done) {
        image.manipulator.process.resolves();

        normalize(req, res, () => {
            req.files.length.should.be.equal(2);
            done();
        });
    });

    it('should not do manipulation without resize flag set', function (done) {
        configUtils.set({
            imageOptimization: {
                resize: false,
            }
        });

        normalize(req, res, () => {
            image.manipulator.process.called.should.be.false();
            done();
        });
    });

    it('should call manipulation when resize flag is explicitly set', function (done) {
        image.manipulator.process.rejects();

        normalize(req, res, ()=> {
            common.logging.error.calledOnce.should.be.true();
            req.file.should.not.be.equal(undefined);
            should.not.exist(req.files);
            done();
        });
    });
});
