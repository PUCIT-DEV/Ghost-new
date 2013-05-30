// # Ghost Configuration

/**
 * global module
 **/
(function () {
    "use strict";

    /**
     * @module config
     * @type {Object}
     */
    var config = {};


    /**
     * Blog settings
     */
    config.blogData = {
        url: 'http://local.tryghost.org', //'http://john.onolan.org',
        title: "Ghost Development",
        description: "Interactive designer, public speaker, startup advisor and writer. Living in Austria, attempting world domination via keyboard."
    };
    // ## Admin settings

    /**
     * @property {string} defaultLang
     */
    config.defaultLang = 'en';

    /**
     * @property {boolean} forceI18n
     */
    config.forceI18n = true;

    // ## Themes

    /**
     * @property {string} themeDir
     */

    // Themes
    config.themeDir = 'themes';

    /**
     * @property {string} activeTheme
     */
    config.activeTheme = 'casper';

    // ## Homepage settings
    /**
     * @module homepage
     * @type {Object}
     */
    config.homepage = {};

    /**
     * @property {number} features
     */
    config.homepage.features = 1;

    /**
     * @property {number} posts
     */
    config.homepage.posts = 4;

    config.database = {
        testing: {
            client: 'sqlite3',
            connection: {
                filename: './core/shared/data/tests.db'
            }
        },

        travis: {
            client: 'sqlite3',
            connection: {
                filename: './core/shared/data/tests.db'
            },
            debug: true
        },

        development: {
            client: 'sqlite3',
            connection: {
                filename: './core/shared/data/testdb.db'
            },
            debug: false
            // debug: true
        },

        staging: {},

        production: {}
    };

    /**
     * @property {Array} nav
     */
    config.nav = [{
        title: 'Home',
        url: '/'
    }, {
        title: 'Admin',
        url: '/ghost'
    }];

    /**
     * @property {Object} exports
     */
    module.exports = config;
}());