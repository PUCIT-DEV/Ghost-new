const should = require('should');
const serializers = require('../../../../../../../server/api/v2/utils/serializers');
const configUtils = require('../../../../../../utils/configUtils');

describe('Unit: v2/utils/serializers/input/posts', function () {
    describe('browse', function () {
        it('default', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        user: 0,
                        api_key_id: 1
                    }
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('page:false');
        });

        it('should not work for non public context', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        user: 1
                    }
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            should.equal(frame.options.filter, undefined);
        });

        it('combine filters', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        user: 0,
                        api_key_id: 1
                    },
                    filter: 'status:published+tag:eins'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('status:published+tag:eins+page:false');
        });

        it('combine filters', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        user: 0,
                        api_key_id: 1
                    },
                    filter: 'page:true+tag:eins'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('page:true+tag:eins+page:false');
        });

        it('combine filters', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        user: 0,
                        api_key_id: 1
                    },
                    filter: 'page:true'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('page:true+page:false');
        });

        it('combine filters', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        user: 0,
                        api_key_id: 1
                    },
                    filter: '(page:true,page:false)'
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.filter.should.eql('(page:true,page:false)+page:false');
        });

        it('remove mobiledoc option from formats', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    formats: ['html', 'mobiledoc', 'plaintext'],
                    context: {}
                }
            };

            serializers.input.posts.browse(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
            frame.options.formats.should.containEql('html');
            frame.options.formats.should.containEql('plaintext');
        });
    });

    describe('read', function () {
        it('with api_key_id', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        user: 0,
                        api_key_id: 1
                    }
                },
                data: {}
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.data.page.should.eql(false);
        });

        it('with api_key_id: overrides page', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        user: 0,
                        api_key_id: 1
                    }
                },
                data: {
                    status: 'all',
                    page: true
                }
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.data.status.should.eql('all');
            frame.data.page.should.eql(false);
        });

        it('with user', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        user: 1,
                        api_key_id: 0
                    }
                },
                data: {}
            };

            serializers.input.posts.read(apiConfig, frame);
            should.not.exist(frame.data.page);
        });

        it('with user', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    context: {
                        user: 1,
                        api_key_id: 0
                    }
                },
                data: {
                    page: true
                }
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.data.page.should.eql(true);
        });

        it('remove mobiledoc option from formats', function () {
            const apiConfig = {};
            const frame = {
                options: {
                    formats: ['html', 'mobiledoc', 'plaintext'],
                    context: {}
                },
                data: {}
            };

            serializers.input.posts.read(apiConfig, frame);
            frame.options.formats.should.not.containEql('mobiledoc');
            frame.options.formats.should.containEql('html');
            frame.options.formats.should.containEql('plaintext');
        });
    });

    describe('edit', function () {
        describe('Ensure relative urls are returned for standard image urls', function () {
            after(function () {
                configUtils.restore();
            });

            it('when blog url is without subdir', function () {
                configUtils.set({url: 'https://mysite.com'});
                const apiConfig = {};
                const frame = {
                    options: {
                        context: {
                            user: 0,
                            api_key_id: 1
                        },
                        withRelated: ['tags', 'authors']
                    },
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                feature_image: 'https://mysite.com/content/images/image.jpg',
                                og_image: 'https://mysite.com/mycustomstorage/images/image.jpg',
                                twitter_image: 'https://mysite.com/blog/content/images/image.jpg',
                                tags: [{
                                    id: 'id3',
                                    feature_image: 'http://mysite.com/content/images/image.jpg'
                                }],
                                authors: [{
                                    id: 'id4',
                                    name: 'Ghosty',
                                    profile_image: 'https://somestorage.com/blog/images/image.jpg'
                                }]
                            }
                        ]
                    }
                };
                serializers.input.posts.edit(apiConfig, frame);
                let postData = frame.data.posts[0];
                postData.feature_image.should.eql('/content/images/image.jpg');
                postData.og_image.should.eql('https://mysite.com/mycustomstorage/images/image.jpg');
                postData.twitter_image.should.eql('https://mysite.com/blog/content/images/image.jpg');
                postData.tags[0].feature_image.should.eql('/content/images/image.jpg');
                postData.authors[0].profile_image.should.eql('https://somestorage.com/blog/images/image.jpg');
            });

            it('when blog url is with subdir', function () {
                configUtils.set({url: 'https://mysite.com/blog'});
                const apiConfig = {};
                const frame = {
                    options: {
                        context: {
                            user: 0,
                            api_key_id: 1
                        },
                        withRelated: ['tags', 'authors']
                    },
                    data: {
                        posts: [
                            {
                                id: 'id1',
                                feature_image: 'https://mysite.com/blog/content/images/image.jpg',
                                og_image: 'https://mysite.com/content/images/image.jpg',
                                twitter_image: 'https://mysite.com/mycustomstorage/images/image.jpg',
                                tags: [{
                                    id: 'id3',
                                    feature_image: 'http://mysite.com/blog/mycustomstorage/content/images/image.jpg'
                                }],
                                authors: [{
                                    id: 'id4',
                                    name: 'Ghosty',
                                    profile_image: 'https://somestorage.com/blog/content/images/image.jpg'
                                }]
                            }
                        ]
                    }
                };
                serializers.input.posts.edit(apiConfig, frame);
                let postData = frame.data.posts[0];
                postData.feature_image.should.eql('/blog/content/images/image.jpg');
                postData.og_image.should.eql('https://mysite.com/content/images/image.jpg');
                postData.twitter_image.should.eql('https://mysite.com/mycustomstorage/images/image.jpg');
                postData.tags[0].feature_image.should.eql('http://mysite.com/blog/mycustomstorage/content/images/image.jpg');
                postData.authors[0].profile_image.should.eql('https://somestorage.com/blog/content/images/image.jpg');
            });
        });
    });
});
