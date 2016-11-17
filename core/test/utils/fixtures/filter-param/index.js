/**
 * These fixtures are just for testing the filter spec
 */
var _    = require('lodash'),
    ObjectId = require('bson-objectid'),
    db   = require('../../../../server/data/db'),
    data = {};

// Password = Sl1m3rson
data.users = [
    {
        id: ObjectId.generate(),
        name: 'Leslie Jones',
        slug: 'leslie',
        email: 'ljones@nothere.com',
        password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6',
        website: 'http://twitter.com/ljonestestuser'
    },
    {
        id: ObjectId.generate(),
        name: 'Pat Smith',
        slug: 'pat-smith',
        email: 'pat-smith@nothere.com',
        password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6',
        website: 'http://github.com/patsmithtestuser'
    },
    {
        id: ObjectId.generate(),
        name: 'Cameron Howe',
        slug: 'camhowe',
        email: 'camhowe@c-e-is-real.com',
        password: '$2a$10$.pZeeBE0gHXd0PTnbT/ph.GEKgd0Wd3q2pWna3ynTGBkPKnGIKZL6'
    }
];

data.tags = [
    {
        id: ObjectId.generate(),
        name: 'Getting Started',
        slug: 'getting-started',
        created_by: data.users[0].id
    },
    {
        id: ObjectId.generate(),
        name: 'photo',
        slug: 'photo',
        image: 'some/image/path.jpg',
        description: 'Photo posts',
        created_by: data.users[1].id
    },
    {
        id: ObjectId.generate(),
        name: 'Video',
        slug: 'video',
        image: 'some/image/path.jpg',
        description: 'Video posts',
        created_by: data.users[0].id
    },
    {
        id: ObjectId.generate(),
        name: 'Audio',
        slug: 'audio',
        image: 'some/image/path.jpg',
        description: 'Audio posts',
        created_by: data.users[0].id
    },
    {
        id: ObjectId.generate(),
        name: 'No Posts',
        slug: 'no-posts',
        created_by: data.users[1].id
    },
    {
        id: ObjectId.generate(),
        name: 'Special',
        slug: 'special',
        created_by: data.users[1].id
    }
];

data.posts = [
    {
        id: ObjectId.generate(),
        title: 'First Post',
        slug: 'first-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: [data.tags[0].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Second Post',
        slug: 'second-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[1].id,
        tags: [data.tags[1].id, data.tags[2].id, data.tags[3].id, data.tags[5].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Third Post',
        slug: 'third-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: [data.tags[1].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Fourth Post',
        slug: 'fourth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: [data.tags[2].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Fifth Post',
        slug: 'fifth-post',
        markdown: 'Hello World!',
        featured: true,
        author_id: data.users[1].id,
        tags: [data.tags[5].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Sixth Post',
        slug: 'sixth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[1].id,
        image: 'some/image/path.jpg',
        tags: [data.tags[0].id, data.tags[3].id, data.tags[5].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Seventh Post',
        slug: 'seventh-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        image: 'some/image/path.jpg',
        tags: [data.tags[0].id, data.tags[2].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Eighth Post',
        slug: 'eighth-post',
        markdown: 'Hello World!',
        featured: true,
        author_id: data.users[0].id,
        tags: [data.tags[0].id, data.tags[2].id, data.tags[3].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Ninth Post',
        slug: 'ninth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: [data.tags[1].id, data.tags[3].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Tenth Post',
        slug: 'tenth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: [data.tags[2].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Eleventh Post',
        slug: 'eleventh-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        image: 'some/image/path.jpg',
        tags: [data.tags[1].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Twelfth Post',
        slug: 'twelfth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: [data.tags[3].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Thirteenth Post',
        slug: 'thirteenth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: []
    },
    {
        id: ObjectId.generate(),
        title: 'Fourteenth Post',
        slug: 'fourteenth-post',
        markdown: 'Hello World!',
        featured: true,
        author_id: data.users[0].id,
        tags: [data.tags[3].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Fifteenth Post',
        slug: 'fifteenth-post',
        markdown: 'Hello World! I am a featured page',
        featured: true,
        page: 1,
        author_id: data.users[0].id,
        tags: []
    },
    {
        id: ObjectId.generate(),
        title: 'Sixteenth Post',
        slug: 'sixteenth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: []
    },
    {
        id: ObjectId.generate(),
        title: 'Seventeenth Post',
        slug: 'seventeenth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: []
    },
    {
        id: ObjectId.generate(),
        title: 'Eighteenth Post',
        slug: 'eighteenth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: []
    },
    {
        id: ObjectId.generate(),
        title: 'Nineteenth Post',
        slug: 'nineteenth-post',
        markdown: 'Hello World!',
        featured: false,
        status: 'draft',
        author_id: data.users[0].id,
        tags: [data.tags[0].id, data.tags[1].id, data.tags[2].id, data.tags[3].id]
    },
    {
        id: ObjectId.generate(),
        title: 'Twentieth Post',
        slug: 'twentieth-post',
        markdown: 'Hello World!',
        featured: false,
        author_id: data.users[0].id,
        tags: []
    },
    {
        id: ObjectId.generate(),
        title: 'About Page',
        slug: 'about',
        markdown: 'About Me!',
        featured: false,
        page: 1,
        author_id: data.users[0].id,
        tags: [data.tags[0].id, data.tags[1].id, data.tags[2].id, data.tags[3].id]
    }
];

function fixDataIndexes(origData, storedData) {
    var indexedData = {};
    _.each(origData, function (orig, index) {
        indexedData[index + 1] = _.find(storedData, function (stored) {
            return stored.slug === orig.slug;
        });
    });

    return indexedData;
}

function writeFetchFix(knex, resource) {
    return knex(resource).insert(data[resource]).then(function () {
        return knex(resource).select();
    }).then(function (stored) {
        return fixDataIndexes(data[resource], stored);
    });
}

function createUsers(knex, DataGenerator) {
    // First, loop through and prep the data
    data.users = _.map(data.users, function (user) {
        return DataGenerator.forKnex.createUser(user);
    });

    // Next, insert it into the database & return the correctly indexed data
    return writeFetchFix(knex, 'users');
}

function createTags(knex, DataGenerator) {
    data.tags = _.map(data.tags, function (tag) {
        return DataGenerator.forKnex.createBasic(tag);
    });

    // Next, insert it into the database & return the correctly indexed data
    return writeFetchFix(knex, 'tags');
}

function createPosts(knex, DataGenerator) {
    var postsTags = [];
    data.posts = _.map(data.posts, function (post) {
        post = DataGenerator.forKnex.createPost(post);

        _.each(post.tags, function (tagId) {
            postsTags.push({
                id: ObjectId.generate(),
                post_id: post.id,
                tag_id: tagId
            });
        });

        delete post.tags;
        return post;
    });

    // Next, insert it into the database & return the correctly indexed data
    return writeFetchFix(knex, 'posts').then(function (createdPosts) {
        return knex('posts_tags').insert(postsTags).then(function () {
            return createdPosts;
        });
    });
}

module.exports = function (DataGenerator) {
    var created = {};
    // Create users first
    return createUsers(db.knex, DataGenerator).then(function () {
        // Next create tags
        return createTags(db.knex, DataGenerator);
    }).then(function () {
        // Finally, setup posts with the right authors and tags
        return createPosts(db.knex, DataGenerator);
    }).then(function (createdPosts) {
        created.posts = createdPosts;
        return created;
    });
};

module.exports.data = data;
