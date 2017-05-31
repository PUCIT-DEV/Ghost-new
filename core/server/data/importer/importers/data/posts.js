'use strict';

const debug = require('ghost-ignition').debug('importer:posts'),
    _ = require('lodash'),
    uuid = require('uuid'),
    BaseImporter = require('./base'),
    validation = require('../../../validation');

class PostsImporter extends BaseImporter {
    constructor(options) {
        super(_.extend(options, {
            modelName: 'Post',
            dataKeyToImport: 'posts',
            requiredData: ['tags', 'posts_tags']
        }));

        this.legacyKeys = {
            image: 'feature_image'
        };
    }

    sanitizeAttributes() {
        _.each(this.dataToImport, function (obj) {
            if (!validation.validator.isUUID(obj.uuid || '')) {
                obj.uuid = uuid.v4();
            }
        });
    }

    /**
     * We don't have to worry about existing tag id's.
     * e.g. you import a tag, which exists (doesn't get imported)
     * ...because we add tags by unique name.
     */
    addTagsToPosts() {
        let postTags = this.posts_tags,
            postsWithTags = new Map(),
            self = this,
            duplicatedTagsPerPost = {},
            tagsToAttach = [],
            foundOriginalTag;

        postTags = _.orderBy(postTags, ['post_id', 'sort_order'], ['asc', 'asc']);

        _.each(postTags, function (postTag) {
            if (!postsWithTags.get(postTag.post_id)) {
                postsWithTags.set(postTag.post_id, []);
            }

            if (postsWithTags.get(postTag.post_id).indexOf(postTag.tag_id) !== -1) {
                if (!duplicatedTagsPerPost.hasOwnProperty(postTag.post_id)) {
                    duplicatedTagsPerPost[postTag.post_id] = [];
                }

                duplicatedTagsPerPost[postTag.post_id].push(postTag.tag_id);
            }

            postsWithTags.get(postTag.post_id).push(postTag.tag_id);
        });

        postsWithTags.forEach(function (tagIds, postId) {
            tagsToAttach = [];

            _.each(tagIds, function (tagId) {
                foundOriginalTag = _.find(self.tags, {id: tagId});

                if (!foundOriginalTag) {
                    return;
                }

                tagsToAttach.push(foundOriginalTag);
            });

            _.each(tagsToAttach, function (tag) {
                _.each(self.dataToImport, function (obj) {
                    if (obj.id === postId) {
                        if (!_.isArray(obj.tags)) {
                            obj.tags = [];
                        }

                        if (duplicatedTagsPerPost.hasOwnProperty(postId) && duplicatedTagsPerPost[postId].length) {
                            self.problems.push({
                                message: 'Detected duplicated tags for: ' + obj.title || obj.slug,
                                help: self.modelName,
                                context: JSON.stringify({
                                    tags: _.map(_.filter(self.tags, function (tag) {
                                        return _.indexOf(duplicatedTagsPerPost[postId], tag.id) !== -1;
                                    }), function (value) {
                                        return value.slug || value.name;
                                    })
                                })
                            });
                        }

                        obj.tags.push({
                            name: tag.name
                        });
                    }
                });
            });
        });
    }

    beforeImport() {
        debug('beforeImport');
        var self = this;

        this.sanitizeAttributes();
        this.addTagsToPosts();

        self.dataToImport = this.dataToImport.map(self.legacyMapper);

        // NOTE: do after, because model properties are deleted e.g. post.id
        return super.beforeImport();
    }

    doImport(options) {
        return super.doImport(options);
    }
}

module.exports = PostsImporter;
