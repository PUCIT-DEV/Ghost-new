const _ = require('lodash');
const debug = require('ghost-ignition').debug('api:canary:utils:serializers:output:site');

module.exports = {
    read(data, apiConfig, frame) {
        debug('read');

        frame.response = {
            site: _.pick(data, [
                'title',
                'description',
                'logo',
                'icon',
                'accent_color',
                'url',
                'version',
                'oauth'
            ])
        };
    }
};
