/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var Ghost = require('../../ghost'),
    api = require('../../shared/api'),

    ghost = new Ghost(),
    frontendControllers;

frontendControllers = {
    'homepage': function (req, res) {
        api.posts.browse().then(function (page) {
            ghost.doFilter('prePostsRender', page.posts, function (posts) {
                res.render('index', {posts: posts});
            });
        });
    },
    'single': function (req, res) {
        api.posts.read({'slug': req.params.slug}).then(function (post) {
            ghost.doFilter('prePostsRender', post.toJSON(), function (post) {
                res.render('single', {post: post});
            });
        });
    }
};

module.exports = frontendControllers;