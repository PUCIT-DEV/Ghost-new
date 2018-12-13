const ghostBookshelf = require('./base');
const user = require('./user');

const Author = user.User.extend({
    shouldHavePosts: true
});

const Authors = ghostBookshelf.Collection.extend({
    model: Author
});

module.exports = {
    Author: ghostBookshelf.model('Author', Author),
    Authors: ghostBookshelf.collection('Authors', Authors)
};
