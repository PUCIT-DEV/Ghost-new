const debug = require('ghost-ignition').debug('importer:settings'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    BaseImporter = require('./base'),
    models = require('../../../../models'),
    defaultSettings = require('../../../schema').defaultSettings,
    labsDefaults = JSON.parse(defaultSettings.blog.labs.defaultValue);

class SettingsImporter extends BaseImporter {
    constructor(allDataFromFile) {
        super(allDataFromFile, {
            modelName: 'Settings',
            dataKeyToImport: 'settings'
        });

        this.errorConfig = {
            allowDuplicates: true,
            returnDuplicates: true,
            showNotFoundWarning: false
        };
    }

    /**
     * - 'core' and 'theme' are blacklisted
     * - handle labs setting
     */
    beforeImport() {
        debug('beforeImport');

        const activeTheme = _.find(this.dataToImport, {key: 'active_theme'});

        // We don't import themes. You have to upload the theme first.
        if (activeTheme) {
            this.problems.push({
                message: 'Theme not imported, please upload in Settings - Design',
                help: this.modelName,
                context: JSON.stringify(activeTheme)
            });
        }

        const activeApps = _.find(this.dataToImport, {key: 'active_apps'});
        const installedApps = _.find(this.dataToImport, {key: 'installed_apps'});

        const hasValueEntries = (setting = {}) => {
            try {
                return JSON.parse(setting.value || '[]').length !== 0;
            } catch (e) {
                return false;
            }
        };

        if (hasValueEntries(activeApps) || hasValueEntries(installedApps)) {
            this.problems.push({
                message: 'Old settings for apps were not imported',
                help: this.modelName,
                context: JSON.stringify({activeApps, installedApps})
            });
        }

        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return data.key !== 'active_apps' && data.key !== 'installed_apps';
        });

        const permalinks = _.find(this.dataToImport, {key: 'permalinks'});

        if (permalinks) {
            this.problems.push({
                message: 'Permalink Setting was removed. Please configure permalinks in your routes.yaml.',
                help: this.modelName,
                context: JSON.stringify(permalinks)
            });

            this.dataToImport = _.filter(this.dataToImport, (data) => {
                return data.key !== 'permalinks';
            });
        }

        // Remove core and theme data types
        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return ['core', 'theme'].indexOf(data.type) === -1;
        });

        this.dataToImport = _.filter(this.dataToImport, (data) => {
            return data.key !== 'is_private';
        });

        _.each(this.dataToImport, (obj) => {
            if (obj.key === 'labs' && obj.value) {
                // Overwrite the labs setting with our current defaults
                // Ensures things that are enabled in new versions, are turned on
                obj.value = JSON.stringify(_.assign({}, JSON.parse(obj.value), labsDefaults));
            }

            // CASE: we do not import slack hooks, otherwise it can happen very fast that you are pinging someone's slack channel
            if (obj.key === 'slack') {
                obj.value = JSON.stringify([{url: ''}]);
            }

            // CASE: export files might contain "0" or "1" for booleans. Model layer needs real booleans.
            // transform "0" to false
            if (obj.value === '0' || obj.value === '1') {
                obj.value = !!+obj.value;
            }

            // CASE: export files might contain "false" or "true" for booleans. Model layer needs real booleans.
            // transform "false" to false
            if (obj.value === 'false' || obj.value === 'true') {
                obj.value = obj.value === 'true';
            }
        });

        return super.beforeImport();
    }

    fetchExisting(modelOptions) {
        return models.Settings.findAll(modelOptions)
            .then((existingData) => {
                this.existingData = existingData.toJSON();
            });
    }

    generateIdentifier() {
        this.stripProperties(['id']);
        return Promise.resolve();
    }

    doImport(options) {
        debug('doImport', this.dataToImport.length);

        let ops = [];

        _.each(this.dataToImport, (model) => {
            ops.push(
                models.Settings.edit(model, options)
                    .catch((err) => {
                        return this.handleError(err, model);
                    })
                    .reflect()
            );
        });

        return Promise.all(ops);
    }
}

module.exports = SettingsImporter;
