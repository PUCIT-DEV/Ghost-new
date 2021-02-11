const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const stream = require('stream');
const util = require('util');
const security = require('@tryghost/security');
const {events} = require('../../lib/common');
const themeService = require('../../../frontend/services/themes');
const models = require('../../models');
const request = require('../../lib/request');

const finished = util.promisify(stream.finished);

module.exports = {
    docName: 'themes',

    browse: {
        permissions: true,
        query() {
            return themeService.getJSON();
        }
    },

    activate: {
        headers: {
            cacheInvalidate: true
        },
        options: [
            'name'
        ],
        validation: {
            options: {
                name: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            let themeName = frame.options.name;
            const newSettings = [{
                key: 'active_theme',
                value: themeName
            }];

            return themeService.activate(themeName)
                .then((checkedTheme) => {
                    // @NOTE: we use the model, not the API here, as we don't want to trigger permissions
                    return models.Settings.edit(newSettings, frame.options)
                        .then(() => checkedTheme);
                })
                .then((checkedTheme) => {
                    return themeService.getJSON(themeName, checkedTheme);
                });
        }
    },

    install: {
        headers: {},
        options: [
            'source',
            'ref'
        ],
        validation: {
            source: {
                required: true,
                values: ['github']
            },
            ref: {
                required: true
            }
        },
        permissions: {
            method: 'add'
        },
        async query(frame) {
            if (frame.options.source === 'github') {
                const [org, repo] = frame.options.ref.toLowerCase().split('/');

                // omit /:ref so we fetch the default branch
                const zipUrl = `https://api.github.com/repos/${org}/${repo}/zipball`;
                const zipName = `${repo}.zip`;

                // store zip in a unique temporary folder to avoid conflicts
                const downloadBase = path.join(os.tmpdir(), security.identifier.uid(10));
                const downloadPath = path.join(downloadBase, zipName);

                await fs.ensureDir(downloadBase);

                try {
                    // download zip file
                    const download = request(zipUrl, {
                        followRedirect: true,
                        headers: {
                            accept: 'application/vnd.github.v3+json'
                        },
                        encoding: null,
                        stream: true
                    }).pipe(fs.createWriteStream(downloadPath));

                    await finished(download);

                    // install theme from zip
                    const zip = {
                        path: downloadPath,
                        name: zipName
                    };
                    const {theme, themeOverridden} = await themeService.storage.setFromZip(zip);

                    if (themeOverridden) {
                        this.headers.cacheInvalidate = true;
                    }

                    events.emit('theme.uploaded', {name: theme.name});

                    return theme;
                } finally {
                    // clean up tmp dir with downloaded file
                    fs.remove(downloadBase);
                }
            }
        }
    },

    upload: {
        headers: {},
        permissions: {
            method: 'add'
        },
        query(frame) {
            // @NOTE: consistent filename uploads
            frame.options.originalname = frame.file.originalname.toLowerCase();

            let zip = {
                path: frame.file.path,
                name: frame.file.originalname
            };

            return themeService.storage.setFromZip(zip)
                .then(({theme, themeOverridden}) => {
                    if (themeOverridden) {
                        // CASE: clear cache
                        this.headers.cacheInvalidate = true;
                    }
                    events.emit('theme.uploaded', {name: theme.name});
                    return theme;
                });
        }
    },

    download: {
        options: [
            'name'
        ],
        validation: {
            options: {
                name: {
                    required: true
                }
            }
        },
        permissions: {
            method: 'read'
        },
        query(frame) {
            let themeName = frame.options.name;

            return themeService.storage.getZip(themeName);
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'name'
        ],
        validation: {
            options: {
                name: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            let themeName = frame.options.name;

            return themeService.storage.destroy(themeName);
        }
    }
};
