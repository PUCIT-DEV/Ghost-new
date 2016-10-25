var path = require('path'),
    _ = require('lodash'),
    errors = require('../errors');

exports.isPrivacyDisabled = function isPrivacyDisabled(privacyFlag) {
    if (!this.get('privacy')) {
        return false;
    }

    if (this.get('privacy').useTinfoil === true) {
        return true;
    }

    return this.get('privacy')[privacyFlag] === false;
};

/**
 * transform all relative paths to absolute paths
 * @TODO: imagesRelPath is a dirty little attribute (especially when looking at the usages)
 * @TODO: re-write this function a little bit so we don't have to add the parent path - that is hard to understand
 *
 * Path must be string.
 * Path must match minimum one / or \
 * Path can be a "." to re-present current folder
 */
exports.makePathsAbsolute = function makePathsAbsolute(obj, parent) {
    var self = this;

    if (!obj) {
        throw new errors.IncorrectUsageError({
            message: 'makePathsAbsolute: Object is missing.'
        });
    }

    if (!parent) {
        throw new errors.IncorrectUsageError({
            message: 'makePathsAbsolute: Parent is missing.'
        });
    }

    _.each(obj, function (configValue, pathsKey) {
        if (_.isObject(configValue)) {
            makePathsAbsolute.bind(self)(configValue, parent + ':' + pathsKey);
        } else {
            if (_.isString(configValue) &&
                (configValue.match(/\/+|\\+/) || configValue === '.') &&
                (configValue[0] !== '/' && configValue[0] !== '\\') &&
                pathsKey !== 'imagesRelPath'
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
        case 'storage':
            return path.join(this.get('paths:contentPath'), 'storage/');
        case 'images':
            return path.join(this.get('paths:contentPath'), 'images/');
        case 'apps':
            return path.join(this.get('paths:contentPath'), 'apps/');
        case 'themes':
            return path.join(this.get('paths:contentPath'), 'themes/');
        case 'scheduling':
            return path.join(this.get('paths:contentPath'), 'scheduling/');
        case 'logs':
            return path.join(this.get('paths:contentPath'), 'logs/');
        default:
            throw new Error('getContentPath was called with: ' + type);
    }
};
