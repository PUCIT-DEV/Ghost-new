const _ = require('lodash');
const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const common = require('../../../../../../../server/lib/common');
const validators = require('../../../../../../../server/api/v2/utils/validators');

describe('Unit: v2/utils/validators/input/posts', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('add', function () {
        const apiConfig = {
            docName: 'posts'
        };

        describe('required fields', function () {
            it('should fail with no data', function () {
                const frame = {
                    options: {},
                    data: {}
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with no posts', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: []
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with no posts in array', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: []
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with more than post', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [],
                        tags: []
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail without required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [{
                            what: 'a fail'
                        }],
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should pass with required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [{
                            title: 'pass',
                            authors: [{id: 'correct'}]
                        }],
                    }
                };

                return validators.input.posts.add(apiConfig, frame);
            });

            it('should remove `strip`able fields and leave regular fields', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [{
                            title: 'pass',
                            authors: [{id: 'correct'}],
                            id: 'strip me',
                            created_at: 'strip me',
                            created_by: 'strip me',
                            updated_by: 'strip me',
                            published_by: 'strip me'
                        }],
                    }
                };

                let result = validators.input.posts.add(apiConfig, frame);

                should.exist(frame.data.posts[0].title);
                should.exist(frame.data.posts[0].authors);
                should.not.exist(frame.data.posts[0].id);
                should.not.exist(frame.data.posts[0].created_at);
                should.not.exist(frame.data.posts[0].created_by);
                should.not.exist(frame.data.posts[0].updated_by);
                should.not.exist(frame.data.posts[0].published_by);

                return result;
            });
        });

        describe('field formats', function () {
            const fieldMap = {
                title: [123, new Date(), _.repeat('a', 2001)],
                slug: [123, new Date(), _.repeat('a', 192)],
                mobiledoc: [123, new Date()],
                feature_image: [123, new Date(), 'random words'],
                featured: [123, new Date(), 'abc'],
                status: [123, new Date(), 'abc'],
                locale: [123, new Date(), _.repeat('a', 7)],
                visibility: [123, new Date(), 'abc'],
                meta_title: [123, new Date(), _.repeat('a', 301)],
                meta_description: [123, new Date(), _.repeat('a', 501)],
            };

            Object.keys(fieldMap).forEach(key => {
                it(`should fail for bad ${key}`, function () {
                    const badValues = fieldMap[key];

                    const checks = badValues.map((value) => {
                        const post = {};
                        post[key] = value;

                        if (key !== 'title') {
                            post.title = 'abc';
                        }

                        const frame = {
                            options: {},
                            data: {
                                posts: [post]
                            }
                        };

                        return validators.input.posts.add(apiConfig, frame)
                            .then(Promise.reject)
                            .catch((err) => {
                                (err instanceof common.errors.ValidationError).should.be.true();
                            });
                    });

                    return Promise.all(checks);
                });
            });
        });

        describe('authors structure', function () {
            it('should require properties', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: {}
                            }
                        ]
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should require id', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: [{
                                    name: 'hey'
                                }]
                            }
                        ]
                    }
                };

                return validators.input.posts.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should pass', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: [{
                                    id: 'correct',
                                    name: 'ja'
                                }]
                            }
                        ]
                    }
                };

                return validators.input.posts.add(apiConfig, frame);
            });
        });
    });

    describe('edit', function () {
        const apiConfig = {
            docName: 'posts'
        };

        describe('required fields', function () {
            it('should fail with no data', function () {
                const frame = {
                    options: {},
                    data: {}
                };

                return validators.input.posts.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with no posts', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: []
                    }
                };

                return validators.input.posts.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with more than post', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [],
                        tags: []
                    }
                };

                return validators.input.posts.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should pass with some fields', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [{
                            title: 'pass',
                            updated_at: new Date().toISOString()
                        }],
                    }
                };

                return validators.input.posts.edit(apiConfig, frame);
            });
        });

        describe('authors structure', function () {
            it('should require properties', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: {}
                            }
                        ]
                    }
                };

                return validators.input.posts.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should require id', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                authors: [{
                                    name: 'hey'
                                }]
                            }
                        ]
                    }
                };

                return validators.input.posts.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should pass with valid authors', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                updated_at: new Date().toISOString(),
                                authors: [{
                                    id: 'correct',
                                    name: 'ja'
                                }]
                            }
                        ]
                    }
                };

                return validators.input.posts.edit(apiConfig, frame);
            });

            it('should pass without authors', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                title: 'cool',
                                updated_at: new Date().toISOString()
                            }
                        ]
                    }
                };

                return validators.input.posts.edit(apiConfig, frame);
            });

            it('should pass with authors as array with strings', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                authors: ['email1', 'email2']
                            }
                        ]
                    }
                };

                return validators.input.posts.edit(apiConfig, frame);
            });

            it('should pass with authors as array with strings & objects', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: [
                            {
                                authors: ['email1', {email: 'email'}]
                            }
                        ]
                    }
                };

                return validators.input.posts.edit(apiConfig, frame);
            });
        });
    });
});
