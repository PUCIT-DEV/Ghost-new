var should         = require('should'),
    rewire         = require('rewire'),

// Stuff we are testing
    ampContentHelper    = rewire('../lib/helpers/amp_content');

describe('{{amp_content}} helper', function () {
    afterEach(function () {
        ampContentHelper.__set__('amperizeCache', {});
    });

    it('can render content', function (done) {
        var testData = {
                html: 'Hello World',
                updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                id: 1
            },
            ampResult = ampContentHelper.call(testData);

        ampResult.then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal(testData.html);
            done();
        }).catch(done);
    });

    it('can render content from cache', function (done) {
        var testData = {
                html: 'Hello World',
                updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                id: 1
            },
            ampCachedResult,
            ampResult = ampContentHelper.call(testData),
            amperizeCache = ampContentHelper.__get__('amperizeCache');

        ampResult.then(function (rendered) {
            should.exist(rendered);
            should.exist(amperizeCache);
            rendered.string.should.equal(testData.html);
            amperizeCache[1].should.have.property('updated_at', 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)');
            amperizeCache[1].should.have.property('amp', testData.html);
            // call it again, to make it fetch from cache
            ampCachedResult = ampContentHelper.call(testData);
            ampCachedResult.then(function (rendered) {
                should.exist(rendered);
                should.exist(amperizeCache);
                amperizeCache[1].should.have.property('updated_at', 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)');
                amperizeCache[1].should.have.property('amp', testData.html);
                done();
            });
        }).catch(done);
    });

    it('fetches new AMP HTML if post was changed', function (done) {
        var testData1 = {
                html: 'Hello World',
                updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                id: 1
            },
            testData2 = {
                    html: 'Hello Ghost',
                    updated_at: 'Wed Jul 30 2016 18:17:22 GMT+0200 (CEST)',
                    id: 1
                },
            ampResult = ampContentHelper.call(testData1),
            amperizeCache = ampContentHelper.__get__('amperizeCache');

        ampResult.then(function (rendered) {
            should.exist(rendered);
            should.exist(amperizeCache);
            rendered.string.should.equal(testData1.html);
            amperizeCache[1].should.have.property('updated_at', 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)');
            amperizeCache[1].should.have.property('amp', testData1.html);

            // call it again with different values to fetch from Amperize and not from cache
            ampResult = ampContentHelper.call(testData2);
            ampResult.then(function (rendered) {
                should.exist(rendered);
                should.exist(amperizeCache);

                // it should not have the old value,
                amperizeCache[1].should.not.have.property('Wed Jul 30 2016 18:17:22 GMT+0200 (CEST)');
                // only the new one
                rendered.string.should.equal(testData2.html);
                amperizeCache[1].should.have.property('updated_at', 'Wed Jul 30 2016 18:17:22 GMT+0200 (CEST)');
                amperizeCache[1].should.have.property('amp', testData2.html);
                done();
            });
        }).catch(done);
    });

    it('sanitizes remaining and not valid tags', function (done) {
        var testData = {
                html: '<audio src="https://ia801402.us.archive.org/16/items/EDIS-SRP-0197-06/EDIS-SRP-0197-06.mp3" controls="controls">' +
                        '<form<input type="text" placeholder="Hi AMP tester"></form>' +
                        '<script>some script here</script>' +
                        '<style> h1 {color:red;} p {color:blue;}</style>',
                updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                id: 1
            },
            ampResult = ampContentHelper.call(testData);

        ampResult.then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.be.equal('');
            done();
        }).catch(done);
    });

    it('returns if no html is provided', function (done) {
        var testData = {
                updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                id: 1
            },
            ampResult = ampContentHelper.call(testData);

        ampResult.then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.be.equal('');
            done();
        }).catch(done);
    });

    it('can transforms img tags to amp-img', function (done) {
        var testData = {
                html: '<img src="https://ghost.org/images/ghost.png" alt="The Ghost Logo" />',
                updated_at: 'Wed Jul 27 2016 18:17:22 GMT+0200 (CEST)',
                id: 1
            },
            expectedResult = '<amp-img src="https://ghost.org/images/ghost.png" alt="The Ghost Logo" layout="responsive" width="800" height="400"></amp-img>',
            ampResult = ampContentHelper.call(testData);

        ampResult.then(function (rendered) {
            should.exist(rendered);
            rendered.string.should.equal(expectedResult);
            done();
        }).catch(done);
    });
    // TODO: stub Amperize to test returned errors
    it('can handle amperize error');
});
