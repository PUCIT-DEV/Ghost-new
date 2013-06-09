(function () {
    "use strict";

    var _ = require('underscore'),
        moment = require('moment'),
        when = require('when'),
        navHelper = require('./ghostNav'),
        coreHelpers;

    coreHelpers = function (ghost) {
        /**
         * [ description]
         * @todo ghost core helpers + a way for themes to register them
         * @param  {Object} context date object
         * @param  {*} block
         * @return {Object} A Moment time / date object
         */
        ghost.registerThemeHelper('dateFormat', function (context, block) {
            var f = block.hash.format || "MMM Do, YYYY";
            return moment(context).format(f);
        });

        /**
         * [ description]
         *
         * @param String key
         * @param String default translation
         * @param {Object} options
         * @return String A correctly internationalised string
         */
        ghost.registerThemeHelper('e', function (key, defaultString, options) {
            var output;

            if (ghost.config().defaultLang === 'en' && _.isEmpty(options.hash) && !ghost.config().forceI18n) {
                output = defaultString;
            } else {
                output = ghost.polyglot().t(key, options.hash);
            }

            return output;
        });

        ghost.registerThemeHelper('json', function (object, options) {
            return JSON.stringify(object);
        });

        return when.all([
            // Just one async helper for now, but could be more in the future
            navHelper.registerWithGhost(ghost)
        ]);
    };


    module.exports.loadCoreHelpers = coreHelpers;
}());

