// Holds all theme configuration information
// that as mostly used by templates and handlebar helpers.

var when          = require('when'),

// Variables
    theme,
    themeConfig = {},
    update;


function theme() {
    return themeConfig;
}

// We must pass the api.settings object
// into this method due to circular dependencies.
// If we were to require the api module here
// there would be a race condition where the ./models/base
// tries to access the config() object before it is created.
function update(settings) {
    return when.all([
        settings.read('title'),
        settings.read('description'),
        settings.read('logo'),
        settings.read('cover')
    ]).then(function (globals) {

        themeConfig.title = globals[0].value;
        themeConfig.description = globals[1].value;
        themeConfig.logo = globals[2] ? globals[2].value : '';
        themeConfig.cover = globals[3] ? globals[3].value : '';
        return;
    });
}

module.exports = theme;
module.exports.update = update;
