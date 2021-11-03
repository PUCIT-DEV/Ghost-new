const errors = require('@tryghost/errors');
const debug = require('@tryghost/debug')('affsfdfsdfsdfsdffsdsdfsd');
const tpl = require('@tryghost/tpl');
const csso = require('csso');
const uglify = require('uglify-js');
const glob = require('tiny-glob');
const path = require('path');
const fs = require('fs').promises;

const messages = {
    badDestination: {
        message: 'Unexpected destination {dest}',
        context: 'Minifier expected a destination that ended in .css or .js'
    },
    missingConstructorOption: {
        message: 'Minifier missing {opt} option',
        context: 'new Minifier({}) requires a {opt} option'
    },
    globalHelp: 'Refer to the readme for @tryghost/minifier for how to use this module'
};

// public API for minify hooks
class Minifier {
    constructor({src, dest}) {
        if (!src) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingConstructorOption.message, {opt: 'src'}),
                context: tpl(messages.missingConstructorOption.context, {opt: 'src'}),
                help: tpl(messages.globalHelp)
            });
        }
        if (!dest) {
            throw new errors.IncorrectUsageError({
                message: tpl(messages.missingConstructorOption.message, {opt: 'dest'}),
                context: tpl(messages.missingConstructorOption.context, {opt: 'dest'}),
                help: tpl(messages.globalHelp)
            });
        }
        this.srcPath = src;
        this.destPath = dest;
    }

    getFullSrc(src) {
        return path.join(this.srcPath, src);
    }

    getFullDest(dest) {
        return path.join(this.destPath, dest);
    }

    async minifyCSS(contents) {
        const result = csso.minify(contents);
        if (result && result.css) {
            return result.css;
        }
        return null;
    }

    async minifyJS(contents) {
        const result = uglify.minify(contents);
        if (result && result.code) {
            return result.code;
        }

        return null;
    }

    async getMatchingFiles(src) {
        return await glob(this.getFullSrc(src));
    }

    async readFiles(files) {
        let mergedFiles = '';
        for (const file of files) {
            const contents = await fs.readFile(file, 'utf8');
            mergedFiles += contents;
        }

        return mergedFiles;
    }

    async writeFile(contents, dest) {
        if (contents) {
            let writePath = this.getFullDest(dest);
            await fs.writeFile(writePath, contents);
            return writePath;
        }
    }

    async minify(options) {
        debug('Begin', options);
        const destinations = Object.keys(options);
        const minifiedFiles = [];

        for (const dest of destinations) {
            const src = options[dest];
            const files = await this.getMatchingFiles(src);
            const contents = await this.readFiles(files);
            let minifiedContents;

            if (dest.endsWith('.css')) {
                minifiedContents = await this.minifyCSS(contents);
            } else if (dest.endsWith('.js')) {
                minifiedContents = await this.minifyJS(contents);
            } else {
                throw new errors.IncorrectUsageError({
                    message: tpl(messages.badDestination.message, {dest}),
                    context: tpl(messages.badDestination.context),
                    help: tpl(messages.globalHelp)
                });
            }

            const result = await this.writeFile(minifiedContents, dest);
            if (result) {
                minifiedFiles.push(result);
            }
        }

        debug('End');
        return minifiedFiles;
    }
}

module.exports = Minifier;
