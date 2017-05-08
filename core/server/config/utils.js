var path = require('path'),
    _ = require('lodash');

exports.isPrivacyDisabled = function isPrivacyDisabled(privacyFlag) {
    if (!this.get('privacy')) {
        return false;
    }

    // CASE: disable all privacy features
    if (this.get('privacy').useTinfoil === true) {
        // CASE: you can still enable single features
        if (this.get('privacy')[privacyFlag] === true) {
            return false;
        }

        return true;
    }

    return this.get('privacy')[privacyFlag] === false;
};

/**
 * transform all relative paths to absolute paths
 * @TODO: re-write this function a little bit so we don't have to add the parent path - that is hard to understand
 *
 * Path must be string.
 * Path must match minimum one / or \
 * Path can be a "." to re-present current folder
 */
exports.makePathsAbsolute = function makePathsAbsolute(obj, parent) {
    var self = this;

    _.each(obj, function (configValue, pathsKey) {
        if (_.isObject(configValue)) {
            makePathsAbsolute.bind(self)(configValue, parent + ':' + pathsKey);
        } else {
            if (_.isString(configValue) &&
                (configValue.match(/\/+|\\+/) || configValue === '.') &&
                (configValue[0] !== '/' && configValue[0] !== '\\')
            ) {
                self.set(parent + ':' + pathsKey, path.join(__dirname + '/../../../', configValue));
            }
        }
    });
};

/**
 * we can later support setting folder names via custom config values
 */
exports.getContentPath = function getContentPath(type) {
    switch (type) {
        case 'images':
            return path.join(this.get('paths:contentPath'), 'images/');
        case 'apps':
            return path.join(this.get('paths:contentPath'), 'apps/');
        case 'themes':
            return path.join(this.get('paths:contentPath'), 'themes/');
        case 'storage':
            return path.join(this.get('paths:contentPath'), 'adapters', 'storage/');
        case 'scheduling':
            return path.join(this.get('paths:contentPath'), 'adapters', 'scheduling/');
        case 'logs':
            return path.join(this.get('paths:contentPath'), 'logs/');
        case 'data':
            return path.join(this.get('paths:contentPath'), 'data/');
        default:
            throw new Error('getContentPath was called with: ' + type);
    }
};

/**
 * nconf merges all database keys together and this can be confusing
 * e.g. production default database is sqlite, but you override the configuration with mysql
 *
 * this.clear('key') does not work
 * https://github.com/indexzero/nconf/issues/235#issuecomment-257606507
 */
exports.sanitizeDatabaseProperties = function sanitizeDatabaseProperties() {
    var database = this.get('database');

    if (this.get('database:client') === 'mysql') {
        delete database.connection.filename;
    } else {
        delete database.connection.host;
        delete database.connection.user;
        delete database.connection.password;
        delete database.connection.database;
    }

    this.set('database', database);
};
