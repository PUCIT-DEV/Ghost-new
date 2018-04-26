'use strict';

var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    Promise = require('bluebird'),
    testUtils = require('../../utils'),
    configUtils = require('../../utils/configUtils'),
    markdownToMobiledoc = require('../../utils/fixtures/data-generator').markdownToMobiledoc,
    helpers = require('../../../server/helpers'),
    urlService = require('../../../server/services/url'),
    api = require('../../../server/api'),
    sandbox = sinon.sandbox.create();

describe('{{url}} helper', function () {
    var rendered;

    before(function () {
        configUtils.set({url: 'http://localhost:82832/'});
    });

    beforeEach(function () {
        rendered = null;

        sandbox.stub(urlService, 'getUrlByResourceId');

        sandbox.stub(api.settings, 'read').callsFake(function () {
            return Promise.resolve({settings: [{value: '/:slug/'}]});
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        configUtils.restore();
    });

    it('should return the slug with a prefix slash if the context is a post', function () {
        const post = testUtils.DataGenerator.forKnex.createPost({
            html: 'content',
            mobiledoc: markdownToMobiledoc('ff'),
            title: 'title',
            slug: 'slug',
            created_at: new Date(0),
            url: '/slug/'
        });

        urlService.getUrlByResourceId.withArgs(post.id, {absolute: undefined, secure: undefined}).returns('/slug/');

        rendered = helpers.url.call(post);
        should.exist(rendered);
        rendered.string.should.equal('/slug/');
    });

    it('should output an absolute URL if the option is present', function () {
        const post = testUtils.DataGenerator.forKnex.createPost({
            html: 'content',
            mobiledoc: markdownToMobiledoc('ff'),
            title: 'title',
            slug: 'slug',
            url: '/slug/',
            created_at: new Date(0)
        });

        urlService.getUrlByResourceId.withArgs(post.id, {absolute: 'true', secure: undefined}).returns('http://localhost:82832/slug/');

        rendered = helpers.url.call(post, {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('http://localhost:82832/slug/');
    });

    it('should output an absolute URL with https if the option is present and secure', function () {
        const post = testUtils.DataGenerator.forKnex.createPost({
            html: 'content',
            mobiledoc: markdownToMobiledoc('ff'),
            title: 'title',
            slug: 'slug',
            url: '/slug/',
            created_at: new Date(0),
            secure: true
        });

        urlService.getUrlByResourceId.withArgs(post.id, {absolute: 'true', secure: true}).returns('https://localhost:82832/slug/');

        rendered = helpers.url.call(post, {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('https://localhost:82832/slug/');
    });

    it('should return the slug with a prefixed /tag/ if the context is a tag', function () {
        const tag = testUtils.DataGenerator.forKnex.createTag({
            name: 'the tag',
            slug: 'the-tag',
            description: null,
            parent: null
        });

        urlService.getUrlByResourceId.withArgs(tag.id, {absolute: undefined, secure: undefined}).returns('/tag/the-tag/');

        rendered = helpers.url.call(tag);
        should.exist(rendered);
        rendered.string.should.equal('/tag/the-tag/');
    });

    it('should return the slug with a prefixed /author/ if the context is author', function () {
        const user = testUtils.DataGenerator.forKnex.createUser({
            bio: null,
            website: null,
            profile_image: null,
            location: null,
            slug: 'some-author'
        });

        urlService.getUrlByResourceId.withArgs(user.id, {absolute: undefined, secure: undefined}).returns('/author/some-author/');

        rendered = helpers.url.call(user);
        should.exist(rendered);
        rendered.string.should.equal('/author/some-author/');
    });

    it('should return / if not a post or tag', function () {
        rendered = helpers.url.call({something: 'key'});
        should.exist(rendered);
        rendered.string.should.equal('/');
    });

    it('should return a relative url if passed through a nav context', function () {
        rendered = helpers.url.call(
            {url: '/foo', label: 'Foo', slug: 'foo', current: true});
        should.exist(rendered);
        rendered.string.should.equal('/foo');
    });

    it('should return an absolute url if passed through a nav context', function () {
        rendered = helpers.url.call(
            {url: '/bar', label: 'Bar', slug: 'bar', current: true},
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('http://localhost:82832/bar');
    });

    it('should return an absolute url with https if context is secure', function () {
        rendered = helpers.url.call(
            {url: '/bar', label: 'Bar', slug: 'bar', current: true, secure: true},
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('https://localhost:82832/bar');
    });

    it('external urls should be retained in a nav context', function () {
        rendered = helpers.url.call(
            {url: 'http://casper.website/baz', label: 'Baz', slug: 'baz', current: true},
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('http://casper.website/baz');
    });

    it('should handle hosted urls in a nav context', function () {
        rendered = helpers.url.call(
            {url: 'http://localhost:82832/qux', label: 'Qux', slug: 'qux', current: true},
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('http://localhost:82832/qux');
    });

    it('should handle hosted urls in a nav context with secure', function () {
        rendered = helpers.url.call(
            {
                url: 'http://localhost:82832/qux', label: 'Qux', slug: 'qux', current: true,
                secure: true
            },
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('https://localhost:82832/qux');
    });

    it('should handle hosted https urls in a nav context with secure', function () {
        rendered = helpers.url.call(
            {
                url: 'https://localhost:82832/qux', label: 'Qux', slug: 'qux', current: true,
                secure: true
            },
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('https://localhost:82832/qux');
    });

    it('should handle hosted urls with the wrong protocol in a nav context', function () {
        rendered = helpers.url.call(
            {url: 'https://localhost:82832/quux', label: 'Quux', slug: 'quux', current: true},
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('http://localhost:82832/quux');
    });

    it('should pass through protocol-less URLs regardless of absolute setting', function () {
        rendered = helpers.url.call(
            {url: '//casper.website/baz', label: 'Baz', slug: 'baz', current: true},
            {hash: {}});
        should.exist(rendered);
        rendered.string.should.equal('//casper.website/baz');

        rendered = helpers.url.call(
            {url: '//casper.website/baz', label: 'Baz', slug: 'baz', current: true},
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('//casper.website/baz');
    });

    it('should pass through URLs with alternative schemes regardless of absolute setting', function () {
        rendered = helpers.url.call(
            {url: 'tel:01234567890', label: 'Baz', slug: 'baz', current: true},
            {hash: {}});
        should.exist(rendered);
        rendered.string.should.equal('tel:01234567890');

        rendered = helpers.url.call(
            {url: 'mailto:example@ghost.org', label: 'Baz', slug: 'baz', current: true},
            {hash: {}});
        should.exist(rendered);
        rendered.string.should.equal('mailto:example@ghost.org');

        rendered = helpers.url.call(
            {url: 'tel:01234567890', label: 'Baz', slug: 'baz', current: true},
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('tel:01234567890');

        rendered = helpers.url.call(
            {url: 'mailto:example@ghost.org', label: 'Baz', slug: 'baz', current: true},
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('mailto:example@ghost.org');
    });

    it('should pass through anchor-only URLs  regardless of absolute setting', function () {
        rendered = helpers.url.call(
            {url: '#thatsthegoodstuff', label: 'Baz', slug: 'baz', current: true},
            {hash: {}});
        should.exist(rendered);
        rendered.string.should.equal('#thatsthegoodstuff');

        rendered = helpers.url.call(
            {url: '#thatsthegoodstuff', label: 'Baz', slug: 'baz', current: true},
            {hash: {absolute: 'true'}});
        should.exist(rendered);
        rendered.string.should.equal('#thatsthegoodstuff');
    });

    it('should not HTML-escape URLs', function () {
        rendered = helpers.url.call(
            {url: '/foo?foo=bar&baz=qux', label: 'Foo', slug: 'foo', current: true});
        should.exist(rendered);
        rendered.string.should.equal('/foo?foo=bar&baz=qux');
    });

    it('should encode URLs', function () {
        rendered = helpers.url.call(
            {url: '/foo?foo=bar&baz=qux&<script>alert("gotcha")</script>', label: 'Foo', slug: 'foo', current: true});
        should.exist(rendered);
        rendered.string.should.equal('/foo?foo=bar&baz=qux&%3Cscript%3Ealert(%22gotcha%22)%3C/script%3E');
    });

    it('should not double-encode URLs', function () {
        rendered = helpers.url.call(
            {url: '/?foo=space%20bar', label: 'Foo', slug: 'foo', current: true});
        should.exist(rendered);
        rendered.string.should.equal('/?foo=space%20bar');
    });

    describe('with subdir', function () {
        it('external urls should be retained in a nav context with subdir', function () {
            configUtils.set({url: 'http://localhost:82832/blog'});
            rendered = helpers.url.call(
                {url: 'http://casper.website/baz', label: 'Baz', slug: 'baz', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('http://casper.website/baz');
        });

        it('should handle subdir being set in nav context', function () {
            configUtils.set({url: 'http://localhost:82832/blog'});

            rendered = helpers.url.call(
                {url: '/xyzzy', label: 'xyzzy', slug: 'xyzzy', current: true},
                {hash: {absolute: 'true'}});
            should.exist(rendered);
            rendered.string.should.equal('http://localhost:82832/blog/xyzzy');
        });
    });
});
