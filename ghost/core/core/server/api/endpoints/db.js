const moment = require('moment-timezone');
const dbBackup = require('../../data/db/backup');
const exporter = require('../../data/exporter');
const importer = require('../../data/importer');
const mediaInliner = require('../../services/media-inliner');
const errors = require('@tryghost/errors');
const models = require('../../models');
const settingsCache = require('../../../shared/settings-cache');
const {pool} = require('@tryghost/promise');

module.exports = {
    docName: 'db',

    backupContent: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        options: [
            'include',
            'filename'
        ],
        validation: {
            options: {
                include: {
                    values: exporter.BACKUP_TABLES
                }
            }
        },
        query(frame) {
            // NOTE: we need to have `include` property available as backupDatabase uses it internally
            Object.assign(frame.options, {include: frame.options.withRelated});

            return dbBackup.backup(frame.options);
        }
    },

    exportContent: {
        options: [
            'include',
            'filename'
        ],
        validation: {
            options: {
                include: {
                    values: exporter.BACKUP_TABLES
                }
            }
        },
        headers: {
            disposition: {
                type: 'file',
                value: () => (exporter.fileName())
            },
            cacheInvalidate: false
        },
        permissions: true,
        async query(frame) {
            if (frame.options.filename) {
                let backup = await dbBackup.readBackup(frame.options.filename);

                if (!backup) {
                    throw new errors.NotFoundError();
                }

                return backup;
            }

            return Promise.resolve()
                .then(() => exporter.doExport({include: frame.options.withRelated}))
                .catch((err) => {
                    return Promise.reject(new errors.InternalServerError({err: err}));
                });
        }
    },

    importContent: {
        statusCode(result) {
            if (result && (result.db || result.problems)) {
                return 200;
            } else {
                return 202;
            }
        },
        headers: {
            cacheInvalidate: true
        },
        permissions: true,
        async query(frame) {
            const siteTimezone = settingsCache.get('timezone');
            const importTag = `#Import ${moment().tz(siteTimezone).format('YYYY-MM-DD HH:mm')}`;

            let email;
            if (frame.user) {
                email = frame.user.get('email');
            } else {
                email = await models.User.getOwnerUser().get('email');
            }

            return importer.importFromFile(frame.file, {
                user: {
                    email: email
                },
                importTag
            });
        }
    },

    inlineMedia: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            method: 'importContent'
        },
        validation: {
            options: {
                include: {
                    values: ['domains']
                }
            }
        },
        async query(frame) {
            return mediaInliner.api.startMediaInliner(frame.data.domains);
        }
    },

    deleteAllContent: {
        headers: {
            cacheInvalidate: true
        },
        statusCode: 204,
        permissions: true,
        query() {
            /**
             * @NOTE:
             * We fetch all posts with `columns:id` to increase the speed of this endpoint.
             * And if you trigger `post.destroy(..)`, this will trigger bookshelf and model events.
             * But we only have to `id` available in the model. This won't work, because:
             *   - model layer can't trigger event e.g. `post.page` to trigger `post|page.unpublished`.
             *   - `onDestroyed` or `onDestroying` can contain custom logic
             */
            function deleteContent() {
                return models.Base.transaction(async transacting => {
                    const queryOpts = {
                        columns: 'id',
                        context: {internal: true},
                        destroyAll: true,
                        transacting: transacting
                    };

                    const postDeletionTasks = async () => {
                        const response = await models.Post.findAll(queryOpts);
                        return response.models.map(post => {
                            return async () => {
                            await models.Post.destroy(Object.assign({id: post.id}, queryOpts));
                            };
                        });
                    };

                    const tagDeletionTasks = async () => {
                        const response = await models.Tag.findAll(queryOpts);
                        return response.models.map(tag => {
                            return async () => {
                            await models.Tag.destroy(Object.assign({id: tag.id}, queryOpts));
                            };
                        });
                    };

                    const tasks = [postDeletionTasks, tagDeletionTasks];

                    try {
                        await pool(tasks, 100);
                    } catch (err) {
                        throw new errors.InternalServerError({
                            err: err
                        });
                    }
                });
            }


            return dbBackup.backup().then(deleteContent);
        }
    }
};
