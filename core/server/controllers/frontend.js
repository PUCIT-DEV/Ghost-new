/**
 * Main controller for Ghost frontend
 */

/*global require, module */

var config  = require('../config'),
    api     = require('../api'),
    RSS     = require('rss'),
    _       = require('underscore'),
    errors  = require('../errorHandling'),
    when    = require('when'),
    url     = require('url'),
    filters = require('../../server/filters'),

    frontendControllers;

frontendControllers = {
    'homepage': function (req, res, next) {
        // Parse the page number
        var pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            postsPerPage,
            options = {};

        api.settings.read('postsPerPage').then(function (postPP) {
            postsPerPage = parseInt(postPP.value, 10);
            // No negative pages
            if (isNaN(pageParam) || pageParam < 1) {
                //redirect to 404 page?
                return res.redirect('/');
            }
            options.page = pageParam;

            // Redirect '/page/1/' to '/' for all teh good SEO
            if (pageParam === 1 && req.route.path === '/page/:page/') {
                return res.redirect(config.paths().webroot + '/');
            }

            // No negative posts per page, must be number
            if (!isNaN(postsPerPage) && postsPerPage > 0) {
                options.limit = postsPerPage;
            }
            return;
        }).then(function () {
            return api.posts.browse(options);
        }).then(function (page) {
            var maxPage = page.pages;

            // A bit of a hack for situations with no content.
            if (maxPage === 0) {
                maxPage = 1;
                page.pages = 1;
            }

            // If page is greater than number of pages we have, redirect to last page
            if (pageParam > maxPage) {
                return res.redirect(maxPage === 1 ? config.paths().webroot + '/' : (config.paths().webroot + '/page/' + maxPage + '/'));
            }

            // Render the page of posts
            filters.doFilter('prePostsRender', page.posts).then(function (posts) {
                res.render('index', {posts: posts, pagination: {page: page.page, prev: page.prev, next: page.next, limit: page.limit, total: page.total, pages: page.pages}});
            });
        }).otherwise(function (err) {
            var e = new Error(err.message);
            e.status = err.errorCode;
            return next(e);
        });
    },
    'single': function (req, res, next) {
        api.posts.read(_.pick(req.params, ['id', 'slug'])).then(function (post) {
            if (post) {
                filters.doFilter('prePostsRender', post).then(function (post) {
                    api.settings.read('activeTheme').then(function (activeTheme) {
                        var paths = config.paths().availableThemes[activeTheme.value];
                        if (post.page && paths.hasOwnProperty('page')) {
                            res.render('page', {post: post});
                        } else {
                            res.render('post', {post: post});
                        }
                    });
                });
            } else {
                next();
            }

        }).otherwise(function (err) {
            var e = new Error(err.message);
            e.status = err.errorCode;
            return next(e);
        });
    },
    'rss': function (req, res, next) {
        // Initialize RSS
        var siteUrl = config().url,
            pageParam = req.params.page !== undefined ? parseInt(req.params.page, 10) : 1,
            feed;
        //needs refact for multi user to not use first user as default
        when.all([
            api.users.read({id : 1}),
            api.settings.read('title'),
            api.settings.read('description')
        ]).then(function (values) {
            var user = values[0],
                title = values[1].value,
                description = values[2].value;
            feed = new RSS({
                title: title,
                description: description,
                generator: 'Ghost v' + res.locals.version,
                author: user ? user.name : null,
                feed_url: url.resolve(siteUrl, '/rss/'),
                site_url: siteUrl,
                ttl: '60'
            });

            // No negative pages
            if (isNaN(pageParam) || pageParam < 1) {
                return res.redirect(config.paths().webroot + '/rss/');
            }

            if (pageParam === 1 && req.route.path === config.paths().webroot + '/rss/:page/') {
                return res.redirect(config.paths().webroot + '/rss/');
            }

            api.posts.browse({page: pageParam}).then(function (page) {
                var maxPage = page.pages;

                // A bit of a hack for situations with no content.
                if (maxPage === 0) {
                    maxPage = 1;
                    page.pages = 1;
                }

                // If page is greater than number of pages we have, redirect to last page
                if (pageParam > maxPage) {
                    return res.redirect(config.paths().webroot + '/rss/' + maxPage + '/');
                }

                filters.doFilter('prePostsRender', page.posts).then(function (posts) {
                    posts.forEach(function (post) {
                        var item = {
                                title:  _.escape(post.title),
                                guid: post.uuid,
                                url: siteUrl + '/' + post.slug + '/',
                                date: post.published_at
                            },
                            content = post.html;

                        //set img src to absolute url
                        content = content.replace(/src=["|'|\s]?([\w\/\?\$\.\+\-;%:@&=,_]+)["|'|\s]?/gi, function (match, p1) {
                            /*jslint unparam:true*/
                            p1 = url.resolve(siteUrl, p1);
                            return "src='" + p1 + "' ";
                        });
                        //set a href to absolute url
                        content = content.replace(/href=["|'|\s]?([\w\/\?\$\.\+\-;%:@&=,_]+)["|'|\s]?/gi, function (match, p1) {
                            /*jslint unparam:true*/
                            p1 = url.resolve(siteUrl, p1);
                            return "href='" + p1 + "' ";
                        });
                        item.description = content;
                        feed.item(item);
                    });
                    res.set('Content-Type', 'text/xml');
                    res.send(feed.xml());
                });
            });
        }).otherwise(function (err) {
            var e = new Error(err.message);
            e.status = err.errorCode;
            return next(e);
        });
    }
};

module.exports = frontendControllers;
