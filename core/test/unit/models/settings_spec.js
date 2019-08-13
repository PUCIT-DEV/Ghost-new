const should = require('should');
const sinon = require('sinon');
const mockDb = require('mock-knex');
const models = require('../../../server/models');
const {knex} = require('../../../server/data/db');
const defaultSettings = require('../../../server/data/schema').defaultSettings.blog.image_sizes.defaultValue;
const common = require('../../../server/lib/common');

describe('Unit: models/settings', function () {
    before(function () {
        models.init();
    });

    describe('events', function () {
        let tracker;
        let eventSpy;

        beforeEach(function () {
            mockDb.mock(knex);
            tracker = mockDb.getTracker();
            tracker.install();
        });

        afterEach(function () {
            mockDb.unmock(knex);
        });

        beforeEach(function () {
            eventSpy = sinon.spy(common.events, 'emit');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('emits add events', function () {
            tracker.on('query', (query, step) => {
                return [
                    function fetchAddQuery() {
                        query.response([{}]);
                    },
                    function addQuery() {
                        query.response([{
                            key: 'description',
                            value: 'added value'
                        }]);
                    }
                ][step - 1]();
            });

            return models.Settings.edit({
                    key: 'description',
                    value: 'added value'
                })
                .then(() => {
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('settings.added').should.be.true();
                    eventSpy.secondCall.calledWith('settings.description.added').should.be.true();
                });
        });

        it('emits edit events', function () {
            tracker.on('query', (query, step) => {
                return [
                    function fetchEditQuery() {
                        query.response([{
                            id: 1,    // NOTE: `id` imitates existing value for 'edit' event
                            key: 'description',
                            value: 'db value'
                        }]);
                    }
                ][step - 1]();
            });

            return models.Settings.edit({
                    key: 'description',
                    value: 'edited value'
                })
                .then(() => {
                    eventSpy.calledTwice.should.be.true();
                    eventSpy.firstCall.calledWith('settings.edited').should.be.true();
                    eventSpy.secondCall.calledWith('settings.description.edited').should.be.true();
                });
        });
    });

    describe('defaults', function () {
        let tracker;
        let eventSpy;

        beforeEach(function () {
            mockDb.mock(knex);
            tracker = mockDb.getTracker();
            tracker.install();
        });

        afterEach(function () {
            mockDb.unmock(knex);
            tracker.uninstall();
        });

        beforeEach(function () {
            eventSpy = sinon.spy(common.events, 'emit');
        });

        afterEach(function () {
            sinon.restore();
        });

        it('populates unset defaults', function () {
            tracker.on('query', (query) => {
                return query.response([{}]);
            });

            return models.Settings.populateDefaults()
                .then(() => {
                    eventSpy.callCount.should.equal(80);

                    eventSpy.args[1][0].should.equal('settings.db_hash.added');
                    eventSpy.args[1][1].attributes.type.should.equal('core');

                    eventSpy.args[13][0].should.equal('settings.description.added');
                    eventSpy.args[13][1].attributes.type.should.equal('blog');
                    eventSpy.args[13][1].attributes.value.should.equal('The professional publishing platform');

                    eventSpy.args[62][0].should.equal('settings.added');
                    eventSpy.args[62][1].attributes.key.should.equal('image_sizes');

                    eventSpy.args[79][0].should.equal('settings.members_subscription_settings.added');
                });
        });

        it('doesn\'t overwrite any existing settings', function () {
            tracker.on('query', (query) => {
                return query.response([{
                    key: 'description',
                    value: 'Adam\'s Blog'
                }]);
            });

            return models.Settings.populateDefaults()
                .then(() => {
                    eventSpy.callCount.should.equal(78);

                    eventSpy.args[13][0].should.equal('settings.logo.added');
                });
        });
    });

    describe('parse', function () {
        it('ensure correct parsing when fetching from db', function () {
            const setting = models.Settings.forge();

            let returns = setting.parse({key: 'is_private', value: 'false'});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: false});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: true});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'is_private', value: 'true'});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'is_private', value: '0'});
            should.equal(returns.value, false);

            returns = setting.parse({key: 'is_private', value: '1'});
            should.equal(returns.value, true);

            returns = setting.parse({key: 'something', value: 'null'});
            should.equal(returns.value, 'null');
        });
    });

    describe('merge image_sizes', function () {
        it('incoming values should not override "core" values', function () {
            const setting = models.Settings.forge();

            const merged = setting.mergeImageSizes(defaultSettings, JSON.stringify({publisher_logo: {width: 333}}));

            should.equal(merged, defaultSettings);
        });

        it('incoming "theme" values should merge with override "core" values', function () {
            const setting = models.Settings.forge();

            const merged = setting.mergeImageSizes(defaultSettings, JSON.stringify({xl: {width: 2000, type: 'theme'}}));

            should.equal(merged, JSON.stringify(Object.assign({xl: {width: 2000, type: 'theme'}}, JSON.parse(defaultSettings))));
        });

        it('mix of incoming "theme" and "core" values should merge with override "core" values', function () {
            const setting = models.Settings.forge();

            const merged = setting.mergeImageSizes(defaultSettings, JSON.stringify({xl: {width: 2000, type: 'theme'}, publisher_logo: {width: 333}}));

            should.equal(merged, JSON.stringify(Object.assign({xl: {width: 2000, type: 'theme'}}, JSON.parse(defaultSettings))));
        });

        it('incoming values should override non-"core" values', function () {
            const setting = models.Settings.forge();
            const nonCoreValue = JSON.stringify({xl: {width: 2000, type: 'theme'}});
            const incomingNonCoreValue = JSON.stringify({xl: {width: 333, type: 'theme'}});

            const merged = setting.mergeImageSizes(nonCoreValue, incomingNonCoreValue);

            should.equal(merged, incomingNonCoreValue);
        });

        it('incoming values should not be able to define new "core" values', function () {
            const setting = models.Settings.forge();
            const incomingNonCoreValue = JSON.stringify({xl: {width: 333, type: 'core'}});

            const merged = setting.mergeImageSizes(defaultSettings, incomingNonCoreValue);

            should.equal(merged, defaultSettings);
        });

        it('incoming "theme" values should overwrite all existing "theme" values', function () {
            const setting = models.Settings.forge();
            const existingThemeValue = JSON.stringify({xl: {width: 2000, type: 'theme'}});
            const incomingThemeValue = JSON.stringify({m: {width: 333, type: 'theme'}});

            const merged = setting.mergeImageSizes(existingThemeValue, incomingThemeValue);

            should.equal(merged, incomingThemeValue);
        });

        it('existing "theme" values stay untouched if no new "theme" values are incoming', function () {
            const setting = models.Settings.forge();
            const existingThemeValue = {xl: {width: 2000, type: 'theme'}};
            const incomingThemeValue = {m: {width: 333, type: 'api'}};

            const merged = setting.mergeImageSizes(JSON.stringify(existingThemeValue), JSON.stringify(incomingThemeValue));

            should.equal(merged, JSON.stringify({
                m: {width: 333, type: 'api'},
                xl: {width: 2000, type: 'theme'}
            }));
        });
    });
});
