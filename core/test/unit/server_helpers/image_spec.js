var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    configUtils = require('../../utils/configUtils'),

// Stuff we are testing
    helpers = require('../../../server/helpers'),

    sandbox = sinon.sandbox.create();

describe('{{image}} helper', function () {
    before(function () {
        configUtils.set({url: 'http://testurl.com/'});
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        configUtils.restore();
    });

    it('should output relative url of image', function () {
        var rendered = helpers.image.call({
            image: '/content/images/image-relative-url.png',
            author: {
                image: '/content/images/author-image-relative-url.png'
            }
        });

        should.exist(rendered);
        rendered.should.equal('/content/images/image-relative-url.png');
    });

    it('should output absolute url of image if the option is present ', function () {
        var rendered = helpers.image.call({
                image: '/content/images/image-relative-url.png',
                author: {image: '/content/images/author-image-relative-url.png'}
            },
            {
                hash: {absolute: 'true'}
            });

        should.exist(rendered);
        rendered.should.equal('http://testurl.com/content/images/image-relative-url.png');
    });

    it('should have no output if there is no image ', function () {
        var rendered = helpers.image.call({image: null}, {hash: {absolute: 'true'}});

        should.not.exist(rendered);
    });

    it('should have no output if there is no image property ', function () {
        var rendered = helpers.image.call({}, {hash: {absolute: 'true'}});

        should.not.exist(rendered);
    });

    describe('with sub-directory', function () {
        before(function () {
            configUtils.set({url: 'http://testurl.com/blog'});
        });
        after(function () {
            configUtils.restore();
        });

        it('should output relative url of image', function () {
            var rendered = helpers.image.call({
                image: '/blog/content/images/image-relative-url.png',
                author: {
                    image: '/blog/content/images/author-image-relative-url.png'
                }
            });

            should.exist(rendered);
            rendered.should.equal('/blog/content/images/image-relative-url.png');
        });

        it('should output absolute url of image if the option is present ', function () {
            var rendered = helpers.image.call({
                    image: '/blog/content/images/image-relative-url.png',
                    author: {image: '/blog/content/images/author-image-relatve-url.png'}
                },
                {
                    hash: {absolute: 'true'}
                });

            should.exist(rendered);
            rendered.should.equal('http://testurl.com/blog/content/images/image-relative-url.png');
        });

        it('should not change output for an external url', function () {
            var rendered = helpers.image.call({
                image: 'http://example.com/picture.jpg',
                author: {
                    image: '/blog/content/images/author-image-relative-url.png'
                }
            });

            should.exist(rendered);
            rendered.should.equal('http://example.com/picture.jpg');
        });
    });
});
