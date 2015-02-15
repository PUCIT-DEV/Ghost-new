/*globals describe, before, it*/
/*jshint expr:true*/
var should         = require('should'),
    hbs            = require('express-hbs'),
    utils          = require('./utils'),

// Stuff we are testing
    handlebars     = hbs.handlebars,
    helpers        = require('../../../server/helpers');

describe('{{navigation}} helper', function () {
    before(function (done) {
        utils.loadHelpers();
        hbs.express3({partialsDir: [utils.config.paths.helperTemplates]});
        hbs.cachePartials(function () {
            done();
        });
    });

    it('has loaded navigation helper', function () {
        should.exist(handlebars.helpers.navigation);
    });

    it('should throw errors on invalid data', function () {
        var runHelper = function (data) {
            return function () {
                helpers.navigation.call(data);
            };
        };

        runHelper('not an object').should.throwError('navigation data is not an object or is a function');
        runHelper(function () {}).should.throwError('navigation data is not an object or is a function');

        runHelper({navigation: [{label: 1, url: 'bar'}]}).should.throwError('Invalid value, Url and Label must be strings');
        runHelper({navigation: [{label: 'foo', url: 1}]}).should.throwError('Invalid value, Url and Label must be strings');
    });

    it('can render empty nav', function () {
        var navigation = {navigation:[]},
            rendered = helpers.navigation.call(navigation);

        should.exist(rendered);
        rendered.string.should.be.equal('');
    });

    it('can render one item', function () {
        var singleItem = {label: 'Foo', url: '/foo'},
            navigation = {navigation: [singleItem]},
            rendered = helpers.navigation.call(navigation),
            testUrl = 'href="' + utils.config.url + '/foo"';

        should.exist(rendered);
        rendered.string.should.containEql('li');
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql(testUrl);
    });

    it('can render multiple items', function () {
        var firstItem = {label: 'Foo', url: '/foo'},
            secondItem = {label: 'Bar Baz Qux', url: '/qux'},
            navigation = {navigation: [firstItem, secondItem]},
            rendered = helpers.navigation.call(navigation),
            testUrl = 'href="' + utils.config.url + '/foo"',
            testUrl2 = 'href="' + utils.config.url + '/qux"';

        should.exist(rendered);
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql('nav-bar-baz-qux');
        rendered.string.should.containEql(testUrl);
        rendered.string.should.containEql(testUrl2);
    });

    it('can annotate the current url', function () {
        var firstItem = {label: 'Foo', url: '/foo'},
            secondItem = {label: 'Bar', url: '/qux'},
            navigation = {
                relativeUrl: '/foo',
                navigation: [firstItem, secondItem]
            },
            rendered = helpers.navigation.call(navigation);

        should.exist(rendered);
        rendered.string.should.containEql('nav-foo');
        rendered.string.should.containEql('nav-current');
        rendered.string.should.containEql('nav-foo nav-current');
        rendered.string.should.containEql('nav-bar"');
    });
});
