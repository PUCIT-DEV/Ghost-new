const _ = require('lodash');
const localUtils = require('../../../index');
const config = require('../../../../../../config');

const tag = (attrs, frame) => {
    if (localUtils.isContentAPI(frame)) {
        delete attrs.created_at;
        delete attrs.updated_at;

        // We are standardising on returning null from the Content API for any empty values
        if (attrs.meta_title === '') {
            attrs.meta_title = null;
        }
        if (attrs.meta_description === '') {
            attrs.meta_description = null;
        }
        if (attrs.description === '') {
            attrs.description = null;
        }
    }

    delete attrs.parent_id;
    delete attrs.parent;

    return attrs;
};

const author = (attrs, frame) => {
    if (localUtils.isContentAPI(frame)) {
        delete attrs.created_at;
        delete attrs.updated_at;
        delete attrs.last_seen;
        delete attrs.status;
        delete attrs.email;

        // @NOTE: used for night shift
        delete attrs.accessibility;

        // Extra properties removed from canary
        delete attrs.tour;

        // We are standardising on returning null from the Content API for any empty values
        if (attrs.twitter === '') {
            attrs.twitter = null;
        }
        if (attrs.bio === '') {
            attrs.bio = null;
        }
        if (attrs.website === '') {
            attrs.website = null;
        }
        if (attrs.facebook === '') {
            attrs.facebook = null;
        }
        if (attrs.meta_title === '') {
            attrs.meta_title = null;
        }
        if (attrs.meta_description === '') {
            attrs.meta_description = null;
        }
        if (attrs.location === '') {
            attrs.location = null;
        }
    }

    // @NOTE: unused fields
    delete attrs.visibility;
    delete attrs.locale;

    return attrs;
};

const post = (attrs, frame) => {
    if (localUtils.isContentAPI(frame)) {
        // @TODO: https://github.com/TryGhost/Ghost/issues/10335
        // delete attrs.page;
        delete attrs.status;

        // We are standardising on returning null from the Content API for any empty values
        if (attrs.twitter_title === '') {
            attrs.twitter_title = null;
        }
        if (attrs.twitter_description === '') {
            attrs.twitter_description = null;
        }
        if (attrs.meta_title === '') {
            attrs.meta_title = null;
        }
        if (attrs.meta_description === '') {
            attrs.meta_description = null;
        }
        if (attrs.og_title === '') {
            attrs.og_title = null;
        }
        if (attrs.og_description === '') {
            attrs.og_description = null;
        }
    } else {
        delete attrs.page;
    }

    if (!attrs.tags) {
        delete attrs.primary_tag;
    }

    if (!attrs.authors) {
        delete attrs.primary_author;
    }

    delete attrs.locale;
    delete attrs.author;
    delete attrs.type;

    return attrs;
};

const action = (attrs) => {
    if (attrs.actor) {
        delete attrs.actor_id;
        delete attrs.resource_id;

        if (attrs.actor_type === 'user') {
            attrs.actor = _.pick(attrs.actor, ['id', 'name', 'slug', 'profile_image']);
            attrs.actor.image = attrs.actor.profile_image;
            delete attrs.actor.profile_image;
        } else {
            attrs.actor = _.pick(attrs.actor, ['id', 'name', 'slug', 'icon_image']);
            attrs.actor.image = attrs.actor.icon_image;
            delete attrs.actor.icon_image;
        }
    } else if (attrs.resource) {
        delete attrs.actor_id;
        delete attrs.resource_id;

        // @NOTE: we only support posts right now
        attrs.resource = _.pick(attrs.resource, ['id', 'title', 'slug', 'feature_image']);
        attrs.resource.image = attrs.resource.feature_image;
        delete attrs.resource.feature_image;
    }
};

const settings = (attrs) => {
    // We don't send mail provider API key in settings API if set in config
    if (_.isArray(attrs)) {
        const membersSubscriptionSettingsObj = attrs.find(({key}) => {
            return key === 'members_subscription_settings';
        }) || {};
        const membersSubscriptionSettings = membersSubscriptionSettingsObj.value;
        if (membersSubscriptionSettings && config.get('mailgunApiKey')) {
            let membersSubscriptionSettingsJson = JSON.parse(membersSubscriptionSettings);
            delete membersSubscriptionSettingsJson.mailgunApiKey;
            delete membersSubscriptionSettingsJson.mailgunDomain;
            attrs.forEach((attr) => {
                if (attr.key === 'members_subscription_settings') {
                    attr.value = JSON.stringify(membersSubscriptionSettingsJson);
                }
            });
        }
    }
};

module.exports.post = post;
module.exports.tag = tag;
module.exports.author = author;
module.exports.action = action;
module.exports.settings = settings;
