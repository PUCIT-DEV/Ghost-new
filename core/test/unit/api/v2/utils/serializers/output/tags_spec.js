const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mapper = require('../../../../../../../server/api/v2/utils/serializers/output/utils/mapper');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');

describe('Unit: v2/utils/serializers/output/tags', () => {
    let tagModel;

    beforeEach(() => {
        tagModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data)});
        };

        sinon.stub(mapper, 'mapTag').returns({});
    });

    afterEach(() => {
        sinon.restore();
    });

    it('calls the mapper when single tag present', () => {
        const apiConfig = {};
        const frame = {
            options: {
                context: {}
            }
        };

        const ctrlResponse = tagModel(testUtils.DataGenerator.forKnex.createTag());

        serializers.output.tags.all(ctrlResponse, apiConfig, frame);

        mapper.mapTag.callCount.should.equal(1);
        mapper.mapTag.getCall(0).args.should.eql([ctrlResponse, frame]);
    });

    it('calls the mapper with multiple tags', () => {
        const apiConfig = {};
        const frame = {
            options: {
                context: {}
            }
        };

        const ctrlResponse = tagModel({
            data: [
                testUtils.DataGenerator.forKnex.createTag(),
                testUtils.DataGenerator.forKnex.createTag()
            ],
            meta: {}
        });

        serializers.output.tags.all(ctrlResponse, apiConfig, frame);

        mapper.mapTag.callCount.should.equal(2);
        mapper.mapTag.getCall(0).args.should.eql([ctrlResponse.data[0], frame]);
    });
});
