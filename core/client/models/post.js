var Post = DS.Model.extend({
    uuid: DS.attr('string'),
    title: DS.attr('string'),
    slug: DS.attr('string'),
    markdown: DS.attr('string', {defaultValue: ''}),
    html: DS.attr('string'),
    image: DS.attr('string'),
    featured: DS.attr('boolean', {defaultValue: false}),
    page: DS.attr('boolean', {defaultValue: false}),
    status: DS.attr('string', {defaultValue: 'draft'}),
    language: DS.attr('string', {defaultValue: 'en_US'}),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
    author: DS.belongsTo('user',  { async: true }),
    created_at: DS.attr('moment-date'),
    created_by: DS.belongsTo('user', { async: true }),
    updated_at: DS.attr('moment-date'),
    updated_by: DS.belongsTo('user', { async: true }),
    published_at: DS.attr('moment-date'),
    published_by: DS.belongsTo('user', { async: true }),
    tags: DS.hasMany('tag', { async: true }),
    
    //## Computed post properties
    isPublished: Ember.computed.equal('status', 'published'),
    isDraft: Ember.computed.equal('status', 'draft'),

    validate: function () {
        var validationErrors = [];

        if (!this.get('title.length')) {
            validationErrors.push({
                message: 'You must specify a title for the post.'
            });
        }

        return validationErrors;
    }.property('title')
});

export default Post;
