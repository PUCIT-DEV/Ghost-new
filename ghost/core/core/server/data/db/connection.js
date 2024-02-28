const _ = require('lodash');
const knex = require('knex');
const os = require('os');
const fs = require('fs');

const HttpContext = require('@tryghost/http-context/build/HttpContext').default;
const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const config = require('../../../shared/config');
const errors = require('@tryghost/errors');
const ConnectionPoolInstrumentation = require('./ConnectionPoolInstrumentation');
let knexInstance;

// @TODO:
// - if you require this file before config file was loaded,
// - then this file is cached and you have no chance to connect to the db anymore
// - bring dynamic into this file (db.connect())
function configure(dbConfig) {
    const client = dbConfig.client;

    if (client === 'sqlite3') {
        // Backwards compatibility with old knex behaviour
        dbConfig.useNullAsDefault = Object.prototype.hasOwnProperty.call(dbConfig, 'useNullAsDefault') ? dbConfig.useNullAsDefault : true;

        // Enables foreign key checks and delete on cascade
        dbConfig.pool = {
            afterCreate(conn, cb) {
                conn.run('PRAGMA foreign_keys = ON', cb);

                // These two are meant to improve performance at the cost of reliability
                // Should be safe for tests. We add them here and leave them on
                if (config.get('env').startsWith('testing')) {
                    conn.run('PRAGMA synchronous = OFF;');
                    conn.run('PRAGMA journal_mode = TRUNCATE;');
                }
            }
        };

        // In the default SQLite test config we set the path to /tmp/ghost-test.db,
        // but this won't work on Windows, so we need to replace the /tmp bit with
        // the Windows temp folder
        const filename = dbConfig.connection.filename;
        if (process.platform === 'win32' && _.isString(filename) && filename.match(/^\/tmp/)) {
            dbConfig.connection.filename = filename.replace(/^\/tmp/, os.tmpdir());
            logging.info(`Ghost DB path: ${dbConfig.connection.filename}`);
        }
    }

    if (client === 'mysql2') {
        dbConfig.connection.timezone = 'Z';
        dbConfig.connection.charset = 'utf8mb4';
        dbConfig.connection.decimalNumbers = true;

        if (process.env.REQUIRE_INFILE_STREAM) {
            if (process.env.NODE_ENV === 'development' || process.env.ALLOW_INFILE_STREAM) {
                dbConfig.connection.infileStreamFactory = path => fs.createReadStream(path);
            } else {
                throw new errors.InternalServerError({message: 'MySQL infile streaming is required to run the current process, but is not allowed. Run the script in development mode or set ALLOW_INFILE_STREAM=1.'});
            }
        }
    }

    return dbConfig;
}

if (!knexInstance && config.get('database') && config.get('database').client) {
    knexInstance = knex(configure(config.get('database')));

    if (config.get('telemetry:connectionPool')) {
        const instrumentation = new ConnectionPoolInstrumentation({knex: knexInstance, logging, metrics, config});
        instrumentation.instrument();
    }

    // Monkey patch the acquireConnection and releaseConnection methods to store / retrieve the connection
    // from the http context (if in the http context), so that we can reuse the connection within the same http context
    const HTTP_CTX_KEY_DB_CONNECTION = 'db_connection';
    const originalAcquireConnection = knexInstance.client.acquireConnection;
    const originalReleaseConnection = knexInstance.client.releaseConnection;

    knexInstance.client.acquireConnection = async function () {
        const httpContextConnection = HttpContext.get(HTTP_CTX_KEY_DB_CONNECTION);

        // If there is a connection in the http context, use it
        if (httpContextConnection) {
            return httpContextConnection;
        }

        // Otherwise, acquire a new connection and store it in the http context,
        // but make sure to release it when the http context is ended
        const connection = originalAcquireConnection.call(knexInstance.client);

        HttpContext.set(HTTP_CTX_KEY_DB_CONNECTION, connection, (value) => {
            originalReleaseConnection.call(knexInstance.client, value);
        });

        return connection;
    };

    knexInstance.client.releaseConnection = (connection) => {
        const httpContextConnection = HttpContext.get(HTTP_CTX_KEY_DB_CONNECTION);

        // Retain the connection if it's the same as the one in the http context
        if (httpContextConnection?.__knexUid === connection.__knexUid) {
            return;
        }

        return originalReleaseConnection.call(knexInstance.client, connection);
    };
}

module.exports = knexInstance;
