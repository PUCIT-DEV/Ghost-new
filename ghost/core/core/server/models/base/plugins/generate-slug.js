const _ = require('lodash');
const security = require('@tryghost/security');

const urlUtils = require('../../../../shared/url-utils');

/**
 * @type {Bookshelf} Bookshelf
 */
module.exports = function (Bookshelf) {
    Bookshelf.Model = Bookshelf.Model.extend({}, {
        /**
         * ### Generate Slug
         * Create a string to act as the permalink for an object.
         * @param {Bookshelf['Model']} Model Model type to generate a slug for
         * @param {String} base The string for which to generate a slug, usually a title or name
         * @param {GenerateSlugOptions} [options] Options to pass to findOne
         * @return {Promise<String>} Resolves to a unique slug string
         */
        generateSlug: function generateSlug(Model, base, options) {
            console.log('generate-slug called with base', base);
            console.log('generate-slug called with options', options);
            let slug;
            let slugTryCount = 1;
            const baseName = Model.prototype.tableName.replace(/s$/, '');
            console.log('baseName is', baseName);
            let longSlug;

            // Look for a matching slug, append an incrementing number if so
            const checkIfSlugExists = function checkIfSlugExists(slugToFind) {
                const args = {slug: slugToFind};

                // status is needed for posts
                if (options && options.status) {
                    args.status = options.status;
                }

                return Model.findOne(args, options).then(function then(found) {
                    let trimSpace;

                    if (!found) {
                        return slugToFind;
                    }

                    slugTryCount += 1;

                    // If we shortened, go back to the full version and try again
                    if (slugTryCount === 2 && longSlug) {
                        slugToFind = longSlug;
                        longSlug = null;
                        slugTryCount = 1;
                        return checkIfSlugExists(slugToFind);
                    }

                    // If this is the first time through, add the hyphen
                    if (slugTryCount === 2) {
                        slugToFind += '-';
                    } else {
                    // Otherwise, trim the number off the end
                        trimSpace = -(String(slugTryCount - 1).length);
                        slugToFind = slugToFind.slice(0, trimSpace);
                    }

                    slugToFind += slugTryCount;

                    return checkIfSlugExists(slugToFind);
                });
            };

            slug = security.string.safe(base, options);

            // the slug may never be longer than the allowed limit of 191 chars, but should also
            // take the counter into count. We reduce a too long slug to 185 so we're always on the
            // safe side, also in terms of checking for existing slugs already.
            if (slug.length > 185) {
            // CASE: don't cut the slug on import
                if (!_.has(options, 'importing') || !options.importing) {
                    slug = slug.slice(0, 185);
                }
            }

            // If it's a user, let's try to cut it down (unless this is a human request)
            if (baseName === 'user' && options && options.shortSlug && slugTryCount === 1 && slug !== 'ghost-owner') {
                longSlug = slug;
                // find the index of the first hyphen after the second character.
                const hyphenIndex = slug.indexOf('-', 3);

                //slug = (slug.indexOf('-') > -1) ? slug.slice(0, slug.indexOf('-')) : slug;
                slug = hyphenIndex > -1 ? slug.slice(0, hyphenIndex) : slug;
            }

            if (!_.has(options, 'importing') || !options.importing) {
            // This checks if the first character of a tag name is a #. If it is, this
            // is an internal tag, and as such we should add 'hash' to the beginning of the slug
                if (baseName === 'tag' && /^#/.test(base)) {
                    slug = 'hash-' + slug;
                }
            }
            // single character slugs break things. Don't let that happen.
            if (slug.length === 1) {
                slug = baseName + '-' + slug;
            }
            // Some keywords cannot be changed
            slug = _.includes(urlUtils.getProtectedSlugs(), slug) ? slug + '-' + baseName : slug;

            // if slug is empty after trimming use the model name
            if (!slug) {
                slug = baseName;
            }

            if (options && options.skipDuplicateChecks === true) {
                return slug;
            }

            // Test for duplicate slugs.
            console.log('try this slug', slug);
            return checkIfSlugExists(slug);
        }
    });
};

/**
 * @type {import('bookshelf')} Bookshelf
 */

/**
 * @typedef {object} GenerateSlugOptions
 * @property {string} [status] Used for posts, to also filter by post status when generating a slug
 * @property {boolean} [importing] Set to true to don't cut the slug on import
 * @property {boolean} [shortSlug] If it's a user, let's try to cut it down (unless this is a human request)
 * @property {boolean} [skipDuplicateChecks] Don't append unique identifiers when the slug is not unique (this prevents any database queries)
 */
