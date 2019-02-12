const _ = require('lodash');
const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const common = require('../../../../../../../server/lib/common');
const validators = require('../../../../../../../server/api/v2/utils/validators');

describe('Unit: v2/utils/validators/input/tags', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('add', function () {
        const apiConfig = {
            docName: 'tags'
        };

        describe('required fields', function () {
            it('should fail with no data', function () {
                const frame = {
                    options: {},
                    data: {}
                };

                return validators.input.tags.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with no tags', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: []
                    }
                };

                return validators.input.tags.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with no tags in array', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: []
                    }
                };

                return validators.input.tags.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with more than tags', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [],
                        posts: []
                    }
                };

                return validators.input.tags.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail without required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [{
                            what: 'a fail'
                        }],
                    }
                };

                return validators.input.tags.add(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should pass with required fields', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [{
                            name: 'pass'
                        }],
                    }
                };

                return validators.input.tags.add(apiConfig, frame);
            });
        });

        describe('field formats', function () {
            const fieldMap = {
                name: [123, new Date(), ',starts-with-coma', _.repeat('a', 192), null],
                slug: [123, new Date(), _.repeat('a', 192), null],
                description: [123, new Date(), _.repeat('a', 500)],
                feature_image: [123, new Date(), 'abc'],
                visibility: [123, new Date(), 'abc', null],
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

                        return validators.input.tags.add(apiConfig, frame)
                            .then(Promise.reject)
                            .catch((err) => {
                                (err instanceof common.errors.ValidationError).should.be.true();
                            });
                    });

                    return Promise.all(checks);
                });
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

                return validators.input.tags.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with no tags', function () {
                const frame = {
                    options: {},
                    data: {
                        posts: []
                    }
                };

                return validators.input.tags.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should fail with more than tags', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [],
                        posts: []
                    }
                };

                return validators.input.tags.edit(apiConfig, frame)
                    .then(Promise.reject)
                    .catch((err) => {
                        (err instanceof common.errors.ValidationError).should.be.true();
                    });
            });

            it('should pass with some fields', function () {
                const frame = {
                    options: {},
                    data: {
                        tags: [{
                            name: 'pass'
                        }],
                    }
                };

                return validators.input.tags.edit(apiConfig, frame);
            });
        });
    });
});
