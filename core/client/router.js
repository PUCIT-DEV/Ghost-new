/*global Ember */

// ensure we don't share routes between all Router instances
var Router = Ember.Router.extend();

Router.reopen({
    location: 'trailing-history', // use HTML5 History API instead of hash-tag based URLs
    rootURL: '/ghost/ember/' // admin interface lives under sub-directory /ghost
});

Router.map(function () {
    this.route('signin');
    this.route('signout');
    this.route('signup');
    this.route('forgotten');
    this.route('reset', { path: '/reset/:token' });
    this.resource('posts', { path: '/' }, function () {
        this.route('post', { path: ':post_id' });
    });
    this.resource('editor', function () {
        this.route('new', { path: '' });
        this.route('edit', { path: ':post_id' });
    });
    this.resource('settings', function () {
        this.route('general');
        this.route('user');
        this.route('apps');
    });
    this.route('debug');
    //Redirect legacy content to posts
    this.route('content');
});

export default Router;
