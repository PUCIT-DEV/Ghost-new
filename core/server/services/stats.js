/**
 * Stats
 * A collection of utilities for handling stats of the site
 */
const debug = require('ghost-ignition').debug('stats');
const moment = require('moment');
const models = require('../models');
const db = require('../data/db');
const {events} = require('../lib/common');

const stats = {};

async function getOldestPostCreatedDate() {
    const result = models.Post.query(qb => qb.orderBy('created_at', 'ASC').limit(1)).fetchAll({columns: ['created_at']});

    return result.models && result.models[0] ? result.models[0] : null;
}

module.exports = {
    async init() {
        await this.updateMembers();
        await this.updatePosts();
        await this.updateSiteCreatedDate();

        debug('Current stats', this.getAll());

        // Set up events

        // We don't update for post.deleted
        // because post.unpublished is emitted when deleting a published post.
        const postEvents = ['post.published', 'post.unpublished', 'post.visibility.changed'];

        postEvents.forEach((event) => {
            events.on(event, async () => {
                await this.updatePosts();
                await this.updateSiteCreatedDate();

                events.emit('updateGlobalTemplateOptions');
            });
        });

        const memberEvents = ['member.added', 'member.deleted', 'member.edited', 'customer.added', 'customer.deleted'];

        memberEvents.forEach((event) => {
            events.on(event, async () => {
                await this.updateMembers();

                events.emit('updateGlobalTemplateOptions');
            });
        });
    },

    async updateMembers() {
        stats.total_members = (await db.knex('members').count())[0]['count(*)'];
        stats.total_paid_members = (await db.knex('members_stripe_customers').countDistinct('member_id'))[0]['count(distinct `member_id`)'];
        stats.total_free_members = stats.total_members - stats.total_paid_members;
    },

    async updatePosts() {
        stats.total_posts = (await db.knex('posts').where({status: 'published'}).count())[0]['count(*)'];
        stats.total_members_posts = (await db.knex('posts').where({visibility: 'members', status: 'published'}).count())[0]['count(*)'];
        stats.total_paid_members_posts = (await db.knex('posts').where({visibility: 'paid', status: 'published'}).count())[0]['count(*)'];
        stats.total_tags = await models.Tag.count();
        stats.total_authors = await models.Author.count();
    },

    async updateSiteCreatedDate() {
        const siteCreatedAt = await getOldestPostCreatedDate();

        Object.assign(stats, {
            get site_age() {
                return siteCreatedAt ? Date.now() - siteCreatedAt : 0;
            },

            get site_age_years() {
                return siteCreatedAt ? moment(Date.now()).diff(siteCreatedAt, 'years') : 0;
            }
        });
    },

    get(key) {
        return stats[key];
    },

    getAll() {
        return stats;
    }
};
