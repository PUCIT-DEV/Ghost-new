var Promise = require('bluebird'),
    versioning = require('./versioning'),
    populate = require('../migration/populate'),
    errors = require('./../../errors');

module.exports = function bootUp() {
    return versioning
        .getDatabaseVersion()
        .then(function successHandler(result) {
            if (!/^alpha/.test(result)) {
                // This database was not created with Ghost alpha, and is not compatible
                throw new errors.DatabaseVersionError({
                    message: 'Your database version is not compatible with Ghost 1.0.0 Alpha (master branch)',
                    context: 'Want to keep your DB? Use Ghost < 1.0.0 or the "stable" branch. Otherwise please delete your DB and restart Ghost',
                    help: 'More information on the Ghost 1.0.0 Alpha at https://support.ghost.org/v1-0-alpha'
                });
            }
        },
        // We don't use .catch here, as it would catch the error from the successHandler
        function errorHandler(err) {
            if (err instanceof errors.DatabaseNotPopulatedError) {
                return populate();
            }

            return Promise.reject(err);
        });
};
