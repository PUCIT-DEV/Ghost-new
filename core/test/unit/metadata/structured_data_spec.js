var getStructuredData = require('../../../server/data/meta/structured_data'),
    should = require('should');

describe('getStructuredData', function () {
    it('should return structured data from metadata', function () {
        var metadata = {
            blog: {
                title: 'Blog Title',
                facebook: 'testuser',
                twitter: '@testuser'
            },
            authorName: 'Test User',
            ogType: 'article',
            metaTitle: 'Post Title',
            canonicalUrl: 'http://mysite.com/post/my-post-slug/',
            publishedDate: '2015-12-25T05:35:01.234Z',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            coverImage: 'http://mysite.com/content/image/mypostcoverimage.jpg',
            authorFacebook: 'testpage',
            creatorTwitter: '@twitterpage',
            keywords: ['one', 'two', 'tag'],
            metaDescription: 'Post meta description'
        },  structuredData = getStructuredData(metadata);

        should.deepEqual(structuredData, {
            'article:modified_time': '2016-01-21T22:13:05.412Z',
            'article:published_time': '2015-12-25T05:35:01.234Z',
            'article:tag': ['one', 'two', 'tag'],
            'article:publisher': 'https://www.facebook.com/testuser',
            'article:author': 'https://www.facebook.com/testpage',
            'og:description': 'Post meta description',
            'og:image': 'http://mysite.com/content/image/mypostcoverimage.jpg',
            'og:site_name': 'Blog Title',
            'og:title': 'Post Title',
            'og:type': 'article',
            'og:url': 'http://mysite.com/post/my-post-slug/',
            'twitter:card': 'summary_large_image',
            'twitter:data1': 'Test User',
            'twitter:data2': ['one', 'two', 'tag'].join(', '),
            'twitter:description': 'Post meta description',
            'twitter:image': 'http://mysite.com/content/image/mypostcoverimage.jpg',
            'twitter:label1': 'Written by',
            'twitter:label2': 'Filed under',
            'twitter:title': 'Post Title',
            'twitter:url': 'http://mysite.com/post/my-post-slug/',
            'twitter:site': '@testuser',
            'twitter:creator': '@twitterpage'
        });
    });

    it('should return structured data from metadata with no nulls', function () {
        var metadata = {
            blog: {
                title: 'Blog Title',
                facebook: '',
                twitter: ''
            },
            authorName: 'Test User',
            ogType: 'article',
            metaTitle: 'Post Title',
            canonicalUrl: 'http://mysite.com/post/my-post-slug/',
            modifiedDate: '2016-01-21T22:13:05.412Z',
            authorFacebook: null,
            creatorTwitter: null,
            coverImage: undefined,
            keywords: null,
            metaDescription: null
        },  structuredData = getStructuredData(metadata);

        should.deepEqual(structuredData, {
            'article:modified_time': '2016-01-21T22:13:05.412Z',
            'og:site_name': 'Blog Title',
            'og:title': 'Post Title',
            'og:type': 'article',
            'og:url': 'http://mysite.com/post/my-post-slug/',
            'twitter:card': 'summary',
            'twitter:data1': 'Test User',
            'twitter:label1': 'Written by',
            'twitter:title': 'Post Title',
            'twitter:url': 'http://mysite.com/post/my-post-slug/'
        });
    });
});
