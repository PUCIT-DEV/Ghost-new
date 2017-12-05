// Pretty URL redirects
//
// These are two pieces of middleware that handle ensuring that
// URLs get formatted correctly.
// Slashes ensures that we get trailing slashes
// Uncapitalise changes case to lowercase
// @TODO optimise this to reduce the number of redirects required to get to a pretty URL
// @TODO move this to being used by routers?
var slashes = require('connect-slashes'),
    config = require('../config');

var baseUrl = config.get('url');

if (!baseUrl) {
    baseUrl = '';
}

module.exports = [

    slashes(true, {
        base: baseUrl,
        headers: {
            'Cache-Control': 'public, max-age=' + config.get('caching:301:maxAge')
        }
    }),
    require('./uncapitalise')
];
