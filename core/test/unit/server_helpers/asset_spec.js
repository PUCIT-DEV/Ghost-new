var should         = require('should'),
    hbs            = require('express-hbs'),
    sinon          = require('sinon'),
    utils          = require('./utils'),
    configUtils    = require('../../utils/configUtils'),
    helpers        = require('../../../server/helpers'),
    settingsCache  = require('../../../server/settings/cache'),
    sandbox        = sinon.sandbox.create(),
    handlebars     = hbs.handlebars;

describe('{{asset}} helper', function () {
    var rendered, localSettingsCache = {};

    before(function () {
        utils.loadHelpers();
        configUtils.set({assetHash: 'abc'});

        sandbox.stub(settingsCache, 'get', function (key) {
            return localSettingsCache[key];
        });
    });

    after(function () {
        configUtils.restore();
        sandbox.restore();
    });

    it('has loaded asset helper', function () {
        should.exist(handlebars.helpers.asset);
    });

    describe('no subdirectory', function () {
        it('handles favicon correctly', function () {
            // without ghost set
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/favicon.ico');
        });

        it('handles custom favicon correctly', function () {
            localSettingsCache.icon = '/content/images/favicon.png';

            // png
            rendered = helpers.asset('favicon.png');
            should.exist(rendered);
            String(rendered).should.equal('/content/images/favicon.png');

            localSettingsCache.icon = '/content/images/favicon.ico';

            // ico
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/content/images/favicon.ico');
        });

        it('handles shared assets correctly', function () {
            localSettingsCache.icon = '';

            rendered = helpers.asset('shared/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/shared/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/assets/js/asset.js?v=abc');
        });
    });

    describe('with /blog subdirectory', function () {
        before(function () {
            configUtils.set({url: 'http://testurl.com/blog'});
        });

        it('handles favicon correctly', function () {
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/blog/favicon.ico');
        });

        it('handles custom favicon correctly', function () {
            localSettingsCache.icon = '/content/images/favicon.png';

            // png
            rendered = helpers.asset('favicon.png');
            should.exist(rendered);
            String(rendered).should.equal('/blog/content/images/favicon.png');

            localSettingsCache.icon = '/content/images/favicon.ico';

            // ico
            rendered = helpers.asset('favicon.ico');
            should.exist(rendered);
            String(rendered).should.equal('/blog/content/images/favicon.ico');
        });

        it('handles shared assets correctly', function () {
            rendered = helpers.asset('shared/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/shared/asset.js?v=abc');
        });

        it('handles theme assets correctly', function () {
            rendered = helpers.asset('js/asset.js');
            should.exist(rendered);
            String(rendered).should.equal('/blog/assets/js/asset.js?v=abc');
        });

        configUtils.restore();
    });
});
