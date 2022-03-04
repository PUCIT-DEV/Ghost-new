const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../../../../utils');
const mapper = require('../../../../../../../core/server/api/canary/utils/serializers/output/utils/mapper');
const serializers = require('../../../../../../../core/server/api/canary/utils/serializers');
const membersService = require('../../../../../../../core/server/services/members');

describe('Unit: canary/utils/serializers/output/preview', function () {
    let pageModel;

    beforeEach(function () {
        pageModel = (data) => {
            return Object.assign(data, {toJSON: sinon.stub().returns(data), get: key => (key === 'type' ? 'page' : '')});
        };

        sinon.stub(membersService, 'api').get(() => {
            return {
                productRepository: {
                    list: () => {
                        return {data: null};
                    }
                }
            };
        });

        sinon.stub(mapper, 'mapPost').returns({});
    });

    afterEach(function () {
        sinon.restore();
    });

    it('calls the mapper', async function () {
        const apiConfig = {};
        const frame = {
            options: {
                withRelated: ['tags', 'authors'],
                context: {
                    private: false
                }
            }
        };

        const ctrlResponse = pageModel(testUtils.DataGenerator.forKnex.createPost({
            id: 'id1',
            type: 'page'
        }));

        await serializers.output.preview.all(ctrlResponse, apiConfig, frame);

        mapper.mapPost.callCount.should.equal(1);
        mapper.mapPost.getCall(0).args.should.eql([ctrlResponse, frame, {tiers: []}]);

        frame.response.preview[0].page.should.equal(true);
    });
});
