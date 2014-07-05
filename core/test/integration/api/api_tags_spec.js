/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should    = require('should'),

    // Stuff we are testing
    DataGenerator = require('../../utils/fixtures/data-generator'),
    TagsAPI       = require('../../../server/api/tags');

describe('Tags API', function () {

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                done();
            }).catch(done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    it('can browse', function (done) {
        TagsAPI.browse().then(function (results) {
            should.exist(results);
            should.exist(results.tags);
            results.tags.length.should.be.above(0);
            testUtils.API.checkResponse(results.tags[0], 'tag');
            results.tags[0].created_at.should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });
});