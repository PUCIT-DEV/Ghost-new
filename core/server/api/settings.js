// # Settings API
// RESTful API for the Setting resource
var _            = require('lodash'),
    dataProvider = require('../models'),
    Promise      = require('bluebird'),
    canThis      = require('../permissions').canThis,
    errors       = require('../errors'),
    utils        = require('./utils'),
    i18n         = require('../i18n'),

    docName      = 'settings',
    settings,

    settingsCache = require('../settings/cache'),

    updateSettingsCache,
    settingsFilter,
    readSettingsResult,
    settingsResult,
    canEditAllSettings,

// @TODO simplify this!
updateSettingsCache = function updateSettingsCache() {
    return dataProvider.Settings.findAll()
        .then(function (settingsCollection) {
            // FindAll returns us a bookshelf Collection of Settings Models.
            // We want to iterate over the models, and for each model:
            // Get the key, and the JSON version of the model, and call settingsCache.set()
            // This is identical to the updateSettingFromModel code inside of settings/cache.init()
            _.each(settingsCollection.models, function updateSettingFromModel(settingModel) {
                settingsCache.set(settingModel.get('key'), settingModel.toJSON());
            });

            return settingsCache.getAll();
        });
};

// ## Helpers

/**
 * ### Settings Filter
 * Filters an object based on a given filter object
 * @private
 * @param {Object} settings
 * @param {String} filter
 * @returns {*}
 */
settingsFilter = function (settings, filter) {
    return _.fromPairs(_.filter(_.toPairs(settings), function (setting) {
        if (filter) {
            return _.some(filter.split(','), function (f) {
                return setting[1].type === f;
            });
        }
        return true;
    }));
};

/**
 * ### Read Settings Result
 *
 * Converts the models to keyed JSON
 * E.g.
 * dbHash: {
 *   id: '123abc',
 *   key: 'dbash',
 *   value: 'xxxx',
 *   type: 'core',
 *   timestamps
 *  }
 *
 * @private
 * @param {Array} settingsModels
 * @returns {Settings}
 */
readSettingsResult = function readSettingsResult(settingsModels) {
    var settings;

    if (Array.isArray(settingsModels)) {
        settings = _.keyBy(_.invokeMap(settingsModels, 'toJSON'), 'key');
    } else {
        settings = _.keyBy(settingsModels.toJSON(), 'key');
    }

    return settings;
};

/**
 * ### Settings Result
 *
 * Takes a keyed JSON object
 * E.g.
 * dbHash: {
 *   id: '123abc',
 *   key: 'dbash',
 *   value: 'xxxx',
 *   type: 'core',
 *   timestamps
 *  }
 *
 *  Performs a filter, based on the `type`
 *  And converts the remaining items to our API format by adding a `setting` and `meta` keys.
 *
 * @private
 * @param {Object} settings - a keyed JSON object
 * @param {String} type
 * @returns {{settings: *}}
 */
settingsResult = function settingsResult(settings, type) {
    var filteredSettings = _.values(settingsFilter(settings, type)),
        result = {
            settings: filteredSettings,
            meta: {}
        };

    if (type) {
        result.meta.filters = {
            type: type
        };
    }

    return result;
};

/**
 * ### Can Edit All Settings
 * Check that this edit request is allowed for all settings requested to be updated
 * @private
 * @param {Object} settingsInfo
 * @returns {*}
 */
canEditAllSettings = function (settingsInfo, options) {
    var checkSettingPermissions = function checkSettingPermissions(setting) {
            if (setting.type === 'core' && !(options.context && options.context.internal)) {
                return Promise.reject(
                    new errors.NoPermissionError({message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')})
                );
            }

            return canThis(options.context).edit.setting(setting.key).catch(function () {
                return Promise.reject(new errors.NoPermissionError({message: i18n.t('errors.api.settings.noPermissionToEditSettings')}));
            });
        },
        checks = _.map(settingsInfo, function (settingInfo) {
            var setting = settingsCache.get(settingInfo.key, {resolve: false});

            if (!setting) {
                return Promise.reject(new errors.NotFoundError(
                    {message: i18n.t('errors.api.settings.problemFindingSetting', {key: settingInfo.key})}
                ));
            }

            return checkSettingPermissions(setting);
        });

    return Promise.all(checks);
};

/**
 * ## Settings API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
settings = {

    /**
     * ### Browse
     * @param {Object} options
     * @returns {*}
     */
    browse: function browse(options) {
        options = options || {};

        var result = settingsResult(settingsCache.getAll(), options.type);

        // If there is no context, return only blog settings
        if (!options.context) {
            return Promise.resolve(_.filter(result.settings, function (setting) { return setting.type === 'blog'; }));
        }

        // Otherwise return whatever this context is allowed to browse
        return canThis(options.context).browse.setting().then(function () {
            // Omit core settings unless internal request
            if (!options.context.internal) {
                result.settings = _.filter(result.settings, function (setting) { return setting.type !== 'core'; });
            }

            return result;
        });
    },

    /**
     * ### Read
     * @param {Object} options
     * @returns {*}
     */
    read: function read(options) {
        if (_.isString(options)) {
            options = {key: options};
        }

        var setting = settingsCache.get(options.key, {resolve: false}),
            result = {};

        if (!setting) {
            return Promise.reject(new errors.NotFoundError(
                {message: i18n.t('errors.api.settings.problemFindingSetting', {key: options.key})}
            ));
        }

        result[options.key] = setting;

        if (setting.type === 'core' && !(options.context && options.context.internal)) {
            return Promise.reject(
                new errors.NoPermissionError({message: i18n.t('errors.api.settings.accessCoreSettingFromExtReq')})
            );
        }

        if (setting.type === 'blog') {
            return Promise.resolve(settingsResult(result));
        }

        return canThis(options.context).read.setting(options.key).then(function () {
            return settingsResult(result);
        }, function () {
            return Promise.reject(new errors.NoPermissionError({message: i18n.t('errors.api.settings.noPermissionToReadSettings')}));
        });
    },

    /**
     * ### Edit
     * Update properties of a setting
     * @param {{settings: }} object Setting or a single string name
     * @param {{id (required), include,...}} options (optional) or a single string value
     * @return {Promise(Setting)} Edited Setting
     */
    edit: function edit(object, options) {
        options = options || {};
        var self = this,
            type;

        // Allow shorthand syntax where a single key and value are passed to edit instead of object and options
        if (_.isString(object)) {
            object = {settings: [{key: object, value: options}]};
        }

        // clean data
        _.each(object.settings, function (setting) {
            if (!_.isString(setting.value)) {
                setting.value = JSON.stringify(setting.value);
            }
        });

        type = _.find(object.settings, function (setting) { return setting.key === 'type'; });
        if (_.isObject(type)) {
            type = type.value;
        }

        object.settings = _.reject(object.settings, function (setting) {
            return setting.key === 'type';
        });

        return canEditAllSettings(object.settings, options).then(function () {
            return utils.checkObject(object, docName).then(function (checkedData) {
                options.user = self.user;
                return dataProvider.Settings.edit(checkedData.settings, options);
            }).then(function (settingsModelsArray) {
                // Instead of a standard bookshelf collection, Settings.edit returns an array of Settings Models.
                // We convert this to JSON, by calling toJSON on each Model (using invokeMap for ease)
                // We use keyBy to create an object that uses the 'key' as a key for each setting.
                var settingsKeyedJSON = _.keyBy(_.invokeMap(settingsModelsArray, 'toJSON'), 'key');
                return settingsResult(settingsKeyedJSON, type);
            });
        });
    }
};

module.exports = settings;

module.exports.updateSettingsCache = updateSettingsCache;
