var config = require('../config'),
    GhostLogger = require('./GhostLogger'),
    adapter = new GhostLogger({
        domain: config.get('url').replace(/[^\w]/gi, '_'),
        env: config.get('env'),
        mode: process.env.NODE_MODE || process.env.MODE || config.get('logging:mode'),
        level: process.env.NODE_LEVEL || process.env.LEVEL || config.get('logging:level'),
        transports: config.get('logging:transports'),
        rotation: config.get('logging:rotation'),
        path: config.get('logging:path') || config.getContentPath('logs')
    });

module.exports = adapter;
