const assert = require('assert');
const cheerio = require('cheerio');
const moment = require('moment');

const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyArray, anyEtag, anyUuid, anyDateWithTimezoneOffset} = matchers;

const postMatcher = {
    published_at: anyDateWithTimezoneOffset,
    created_at: anyDateWithTimezoneOffset,
    updated_at: anyDateWithTimezoneOffset,
    uuid: anyUuid
};

const postMatcheShallowIncludes = Object.assign(
    {},
    postMatcher, {
        tags: anyArray,
        authors: anyArray
    }
);

describe('Posts Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('owner:post', 'users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
        agent.authenticate();
    });

    it('Can request posts', async function () {
        const res = await agent.get('posts/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(11)
                    .fill(postMatcher)
            });

        assert.equal(res.body.posts[0].slug, 'welcome', 'Default order "published_at desc" check');
        assert.equal(res.body.posts[6].slug, 'integrations', 'Default order "published_at desc" check');

        // kitchen sink
        assert.equal(res.body.posts[9].slug, fixtureManager.get('posts', 1).slug);

        let urlParts = new URL(res.body.posts[9].feature_image);
        assert.equal(urlParts.protocol, 'http:');
        assert.equal(urlParts.host, '127.0.0.1:2369');

        urlParts = new URL(res.body.posts[9].url);
        assert.equal(urlParts.protocol, 'http:');
        assert.equal(urlParts.host, '127.0.0.1:2369');

        const $ = cheerio.load(res.body.posts[9].html);
        urlParts = new URL($('img').attr('src'));
        assert.equal(urlParts.protocol, 'http:');
        assert.equal(urlParts.host, '127.0.0.1:2369');

        assert.equal(res.body.posts[7].slug, 'not-so-short-bit-complex');
        assert.match(res.body.posts[7].html, /<a href="http:\/\/127.0.0.1:2369\/about#nowhere" title="Relative URL/);
        assert.equal(res.body.posts[9].slug, 'ghostly-kitchen-sink');
        assert.match(res.body.posts[9].html, /<img src="http:\/\/127.0.0.1:2369\/content\/images\/lol.jpg"/);
    });

    it('Can filter posts by tag', async function () {
        const res = await agent.get('posts/?filter=tag:kitchen-sink,featured:true&include=tags')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(4)
                    .fill(postMatcher)
            });

        const jsonResponse = res.body;
        const ids = jsonResponse.posts.map(p => p.id);

        assert.equal(jsonResponse.posts.length, 4);
        assert.deepEqual(ids, [
            fixtureManager.get('posts', 4).id,
            fixtureManager.get('posts', 2).id,
            fixtureManager.get('posts', 1).id,
            fixtureManager.get('posts', 0).id
        ], 'Should have content filtered and ordered');

        jsonResponse.posts.forEach((post) => {
            if (post.featured) {
                assert.equal(post.featured, true, `Each post must either be featured or have the tag 'kitchen-sink'`);
            } else {
                const tag = post.tags
                    .map(t => t.slug)
                    .filter(s => s === 'kitchen-sink');
                assert.equal(tag, 'kitchen-sink', `Each post must either be featured or have the tag 'kitchen-sink'`);
            }
        });
    });

    it('Can filter posts by authors', async function () {
        const res = await agent
            .get('posts/?filter=authors:[joe-bloggs,pat,ghost,slimer-mcectoplasm]&include=authors')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(11)
                    .fill(postMatcher)
            });

        const jsonResponse = res.body;

        assert.equal(jsonResponse.posts[0].slug, 'not-so-short-bit-complex', 'The API orders by number of matched authors');

        const primaryAuthors = jsonResponse.posts.map((post) => {
            return post.primary_author.slug;
        });
        const ghostPrimaryAuthors = primaryAuthors.filter((value) => {
            return value === 'ghost';
        });
        const joePrimaryAuthors = primaryAuthors.filter((value) => {
            return value === 'joe-bloggs';
        });

        assert.equal(ghostPrimaryAuthors.length, 7, `Each post must either have the author 'joe-bloggs' or 'ghost', 'pat' is non existing author`);
        assert.equal(joePrimaryAuthors.length, 4, `Each post must either have the author 'joe-bloggs' or 'ghost', 'pat' is non existing author`);
    });

    it('Can request fields of posts', async function () {
        await agent
            .get('posts/?&fields=url')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot();
    });

    it('Can include relations', async function () {
        await agent
            .get('posts/?include=tags,authors')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(11)
                    .fill(postMatcheShallowIncludes)
            });
    });

    it('Can request posts from different origin', async function () {
        await agent
            .get('posts/')
            .header('Origin', 'https://example.com')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(11)
                    .fill(postMatcher)
            });
    });

    it('Can filter by published date', async function () {
        function createFilter(publishedAt, op) {
            // This line deliberately uses double quotes because GQL cannot handle either double quotes
            // or escaped singles, see TryGhost/GQL#34
            return encodeURIComponent('published_at:' + op + '\'' + publishedAt + '\'');
        }

        const res = await agent
            .get('posts/?limit=1')
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(1)
                    .fill(postMatcher)
            });

        const post = res.body.posts[0];
        const publishedAt = moment(post.published_at).format('YYYY-MM-DD HH:mm:ss');

        const res2 = await agent
            .get(`posts/?limit=1&filter=${createFilter(publishedAt, `<`)}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(1)
                    .fill(postMatcher)
            });

        const post2 = res2.body.posts[0];
        const publishedAt2 = moment(post2.published_at).format('YYYY-MM-DD HH:mm:ss');

        assert.equal(post2.title, 'Customizing your brand and design settings');

        const res3 = await agent
            .get(`posts/?limit=1&filter=${createFilter(publishedAt2, `>`)}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(1)
                    .fill(postMatcher)
            });

        const post3 = res3.body.posts[0];
        assert.equal(post3.title, 'Start here for a quick overview of everything you need to know');
    });

    it('Can request a single post', async function () {
        await agent
            .get(`posts/${fixtureManager.get('posts', 0).id}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                posts: new Array(1)
                    .fill(postMatcher)
            });
    });
});
