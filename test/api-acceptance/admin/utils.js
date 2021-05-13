const url = require('url');
const _ = require('lodash');
const testUtils = require('../../utils');

// NOTE: the dependance on the schema here is wrong! It is a design flaw which is causing problems for API maintenance and compatibility
//       whenever you need to modify any of the below property lists using schema - rework them into an "allowlist" array like it's done in
//       the commit introducing this comment.
const schema = require('../../../core/server/data/schema').tables;

const API_URL = '/ghost/api/canary/admin/';

const expectedProperties = {
    // API top level
    posts: ['posts', 'meta'],
    pages: ['pages', 'meta'],
    tags: ['tags', 'meta'],
    users: ['users', 'meta'],
    settings: ['settings', 'meta'],
    subscribers: ['subscribers', 'meta'],
    roles: ['roles'],
    pagination: ['page', 'limit', 'pages', 'total', 'next', 'prev'],
    slugs: ['slugs'],
    slug: ['slug'],
    invites: ['invites', 'meta'],
    themes: ['themes'],
    actions: ['actions', 'meta'],
    members: ['members', 'meta'],
    snippets: ['snippets', 'meta'],

    action: ['id', 'resource_type', 'actor_type', 'event', 'created_at', 'actor'],

    config: ['version', 'environment', 'database', 'mail', 'labs', 'clientExtensions', 'enableDeveloperExperiments', 'useGravatar', 'stripeDirect', 'emailAnalytics'],

    post: [
        'id',
        'uuid',
        'title',
        'slug',
        'mobiledoc',
        'comment_id',
        'feature_image',
        'featured',
        'status',
        'visibility',
        'email_recipient_filter',
        'created_at',
        'updated_at',
        'published_at',
        'custom_excerpt',
        'codeinjection_head',
        'codeinjection_foot',
        'custom_template',
        'canonical_url',
        'url',
        'primary_tag',
        'primary_author',
        'excerpt',
        'tags',
        'authors',
        'email',
        'og_image',
        'og_title',
        'og_description',
        'twitter_image',
        'twitter_title',
        'twitter_description',
        'meta_title',
        'meta_description',
        'email_subject',
        'frontmatter'
    ],

    page: [
        'id',
        'uuid',
        'title',
        'slug',
        'mobiledoc',
        'comment_id',
        'feature_image',
        'featured',
        'status',
        'visibility',
        'created_at',
        'updated_at',
        'published_at',
        'custom_excerpt',
        'codeinjection_head',
        'codeinjection_foot',
        'custom_template',
        'canonical_url',
        'url',
        'primary_tag',
        'primary_author',
        'excerpt',
        'tags',
        'authors',
        'og_image',
        'og_title',
        'og_description',
        'twitter_image',
        'twitter_title',
        'twitter_description',
        'meta_title',
        'meta_description',
        'frontmatter'
    ],

    user: _(schema.users)
        .keys()
        .without('visibility')
        .without('password')
        .without('locale')
        .concat('url')
    ,
    tag: _(schema.tags)
        .keys()
        // unused field
        .without('parent_id')
    ,
    setting: _(schema.settings)
        .keys()
    ,
    subscriber: _(schema.subscribers)
        .keys()
    ,
    member: _(schema.members)
        .keys()
        .concat('avatar_image')
        .concat('comped')
        .concat('labels')
    ,
    member_signin_url: ['member_id', 'url'],
    role: _(schema.roles)
        .keys()
    ,
    permission: _(schema.permissions)
        .keys()
    ,
    notification: ['type', 'message', 'status', 'id', 'dismissible', 'location', 'custom'],
    theme: ['name', 'package', 'active'],
    invite: _(schema.invites)
        .keys()
        .without('token')
    ,
    webhook: _(schema.webhooks)
        .keys()
    ,
    email: _(schema.emails)
        .keys(),
    email_preview: ['html', 'subject', 'plaintext'],
    email_recipient: _(schema.email_recipients)
        .keys()
        .filter(key => key.indexOf('@@') === -1),
    snippet: _(schema.snippets).keys()
};

_.each(expectedProperties, (value, key) => {
    if (!value.__wrapped__) {
        return;
    }

    /**
     * @deprecated: x_by
     */
    expectedProperties[key] = value
        .without(
            'created_by',
            'updated_by',
            'published_by'
        )
        .value();
});

module.exports = {
    API: {
        getApiQuery(route) {
            return url.resolve(API_URL, route);
        },

        checkResponse(...args) {
            this.expectedProperties = expectedProperties;
            return testUtils.API.checkResponse.call(this, ...args);
        }
    },

    doAuth(...args) {
        return testUtils.API.doAuth(`${API_URL}session/`, ...args);
    },

    getValidAdminToken(audience) {
        const jwt = require('jsonwebtoken');
        const JWT_OPTIONS = {
            keyid: testUtils.DataGenerator.Content.api_keys[0].id,
            algorithm: 'HS256',
            expiresIn: '5m',
            audience: audience
        };

        return jwt.sign(
            {},
            Buffer.from(testUtils.DataGenerator.Content.api_keys[0].secret, 'hex'),
            JWT_OPTIONS
        );
    }
};
