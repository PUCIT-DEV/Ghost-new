var _          = require('lodash'),
    Promise    = require('bluebird'),
    url        = require('url'),
    routeMatch = require('path-match')(),
    api        = require('../../api'),
    config     = require('../../config'),

    editFormat = '/:edit?';

function getEditFormat(linkStructure) {
    return linkStructure.replace(/\/$/, '') + editFormat;
}

function postLookup(postUrl) {
    var postPath = url.parse(postUrl).path,
        postPermalink = config.theme.permalinks,
        pagePermalink = '/:slug/',
        isEditURL = false,
        matchFuncPost,
        matchFuncPage,
        postParams,
        pageParams,
        params;

    // Convert saved permalink into a path-match function
    matchFuncPost = routeMatch(getEditFormat(postPermalink));
    postParams = matchFuncPost(postPath);

    // Check if the path matches the permalink structure.
    // If there are no matches found, test to see if this is a page instead
    if (postParams === false) {
        matchFuncPage = routeMatch(getEditFormat(pagePermalink));
        pageParams = matchFuncPage(postPath);
    }

    // If there are still no matches then return empty.
    if (pageParams === false) {
        return Promise.resolve();
    }

    params = postParams || pageParams;

    // If params contains edit, and it is equal to 'edit' this is an edit URL
    if (params.edit && params.edit.toLowerCase() === 'edit') {
        isEditURL = true;
    } else if (params.edit !== undefined) {
        // Unknown string in URL, return empty
        return Promise.resolve();
    }

    // Sanitize params we're going to use to lookup the post.
    params = _.pick(params, 'slug', 'id');
    // Add author & tag
    params.include = 'author,tags';

    // Query database to find post
    return api.posts.read(params).then(function then(result) {
        var post = result.posts[0];

        if (!post) {
            return Promise.resolve();
        }

        // CASE: we originally couldn't match the post based on date permalink and we tried to check if its a page
        if (!post.page && !postParams) {
            return Promise.resolve();
        }

        return {
            post: post,
            isEditURL: isEditURL
        };
    });
}

module.exports = postLookup;
