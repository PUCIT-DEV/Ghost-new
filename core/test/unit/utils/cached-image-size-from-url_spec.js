var should         = require('should'),
    sinon          = require('sinon'),
    Promise        = require('bluebird'),
    rewire         = require('rewire'),

// Stuff we are testing
    getCachedImageSizeFromUrl = rewire('../../../server/utils/cached-image-size-from-url'),

    sandbox = sinon.sandbox.create();

describe('getCachedImageSizeFromUrl', function () {
    var sizeOfStub,
        cachedImagedSize;

    beforeEach(function () {
        sizeOfStub = sandbox.stub();
    });

    afterEach(function () {
        sandbox.restore();
        getCachedImageSizeFromUrl.__set__('imageSizeCache', {});
    });

    it('should read from cache, if dimensions for image are fetched already', function (done) {
        var url = 'http://mysite.com/content/image/mypostcoverimage.jpg';

        sizeOfStub.returns(new Promise.resolve({
            width: 50,
            height: 50,
            type: 'jpg'
        }));

        getCachedImageSizeFromUrl.__set__('getImageSizeFromUrl', sizeOfStub);

        getCachedImageSizeFromUrl(url).then(function () {
            // first call to get result from `getImageSizeFromUrl`
            cachedImagedSize = getCachedImageSizeFromUrl.__get__('imageSizeCache');
            should.exist(cachedImagedSize);
            cachedImagedSize.should.have.property(url);
            should.exist(cachedImagedSize[url].width);
            cachedImagedSize[url].width.should.be.equal(50);
            should.exist(cachedImagedSize[url].height);
            cachedImagedSize[url].height.should.be.equal(50);
            // second call to check if values get returned from cache
            getCachedImageSizeFromUrl(url).then(function () {
                cachedImagedSize = getCachedImageSizeFromUrl.__get__('imageSizeCache');
                should.exist(cachedImagedSize);
                cachedImagedSize.should.have.property(url);
                should.exist(cachedImagedSize[url].width);
                cachedImagedSize[url].width.should.be.equal(50);
                should.exist(cachedImagedSize[url].height);
                cachedImagedSize[url].height.should.be.equal(50);

                done();
            });
        }).catch(done);
    });

    it('can handle image-size errors', function (done) {
        var url = 'http://mysite.com/content/image/mypostcoverimage.jpg';

        sizeOfStub.returns(new Promise.reject('error'));

        getCachedImageSizeFromUrl.__set__('getImageSizeFromUrl', sizeOfStub);

        getCachedImageSizeFromUrl(url)
        .then(function () {
            cachedImagedSize = getCachedImageSizeFromUrl.__get__('imageSizeCache');
            should.exist(cachedImagedSize);
            cachedImagedSize.should.have.property(url);
            should.not.exist(cachedImagedSize[url].width);
            should.not.exist(cachedImagedSize[url].height);
            done();
        }).catch(done);
    });

    it('should return null if url is undefined', function (done) {
        var url = null,
            result;

        result = getCachedImageSizeFromUrl(url);

        should.not.exist(result);
        done();
    });
});
