const _ = require('lodash');
const url = require('./utils/url');

module.exports = {
    read(apiConfig, frame) {
        if (frame.options.key === 'ghost_head') {
            frame.options.key = 'codeinjection_head';
        }

        if (frame.options.key === 'ghost_foot') {
            frame.options.key = 'codeinjection_foot';
        }

        if (frame.options.key === 'default_locale') {
            frame.options.key = 'lang';
        }

        if (frame.options.key === 'active_timezone') {
            frame.options.key = 'timezone';
        }
    },

    edit(apiConfig, frame) {
        // CASE: allow shorthand syntax where a single key and value are passed to edit instead of object and options
        if (_.isString(frame.data)) {
            frame.data = {settings: [{key: frame.data, value: frame.options}]};
        }

        frame.data.settings.forEach((setting) => {
            // CASE: transform objects/arrays into string (we store stringified objects in the db)
            // @TODO: This belongs into the model layer. We should stringify before saving and parse when fetching from db.
            // @TODO: Fix when dropping v0.1
            if (_.isObject(setting.value)) {
                setting.value = JSON.stringify(setting.value);
            }

            // @TODO: handle these transformations in a centralised API place (these rules should apply for ALL resources)

            // CASE: Ensure we won't forward strings, otherwise model events or model interactions can fail
            if (setting.value === '0' || setting.value === '1') {
                setting.value = !!+setting.value;
            }

            // CASE: Ensure we won't forward strings, otherwise model events or model interactions can fail
            if (setting.value === 'false' || setting.value === 'true') {
                setting.value = setting.value === 'true';
            }

            if (setting.key === 'ghost_head') {
                setting.key = 'codeinjection_head';
            }

            if (setting.key === 'ghost_foot') {
                setting.key = 'codeinjection_foot';
            }

            if (frame.options.key === 'default_locale') {
                frame.options.key = 'lang';
            }

            if (frame.options.key === 'active_timezone') {
                frame.options.key = 'timezone';
            }

            if (['cover_image', 'icon', 'logo'].includes(setting.key)) {
                setting = url.forSetting(setting);
            }
        });
    }
};
