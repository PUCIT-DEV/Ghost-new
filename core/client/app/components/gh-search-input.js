import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
/* global key */

export default Ember.Component.extend({

    selection: null,
    content: [],
    isLoading: false,
    contentExpiry: 10 * 1000,
    contentExpiresAt: false,

    posts: Ember.computed.filterBy('content', 'category', 'Posts'),
    pages: Ember.computed.filterBy('content', 'category', 'Pages'),
    users: Ember.computed.filterBy('content', 'category', 'Users'),
    tags: Ember.computed.filterBy('content', 'category', 'Tags'),

    _store: Ember.inject.service('store'),
    _routing: Ember.inject.service('-routing'),
    _selectize: Ember.computed(function () {
        return this.$('select')[0].selectize;
    }),

    refreshContent: function () {
        var promises = [],
            now = new Date(),
            contentExpiry = this.get('contentExpiry'),
            contentExpiresAt = this.get('contentExpiresAt'),
            self = this;

        if (self.get('isLoading') || contentExpiresAt > now) { return; }

        self.set('isLoading', true);
        promises.pushObject(this._loadPosts());
        promises.pushObject(this._loadUsers());
        promises.pushObject(this._loadTags());

        Ember.RSVP.all(promises).then(function () { }).finally(function () {
            self.set('isLoading', false);
            self.set('contentExpiresAt', new Date(now.getTime() + contentExpiry));
        });
    },

    _loadPosts: function () {
        var store = this.get('_store'),
            postsUrl = store.adapterFor('post').urlForQuery({}, 'post') + '/',
            postsQuery = {fields: 'id,title,page', limit: 'all', status: 'all', staticPages: 'all'},
            content = this.get('content'),
            self = this;

        return ajax(postsUrl, {data: postsQuery}).then(function (posts) {
            content.removeObjects(self.get('posts'));
            content.removeObjects(self.get('pages'));
            content.pushObjects(posts.posts.map(function (post) {
                return {
                    id: `post.${post.id}`,
                    title: post.title,
                    category: post.page ? 'Pages' : 'Posts'
                };
            }));
        });
    },

    _loadUsers: function () {
        var store = this.get('_store'),
            usersUrl = store.adapterFor('user').urlForQuery({}, 'user') + '/',
            usersQuery = {fields: 'name,slug', limit: 'all'},
            content = this.get('content'),
            self = this;

        return ajax(usersUrl, {data: usersQuery}).then(function (users) {
            content.removeObjects(self.get('users'));
            content.pushObjects(users.users.map(function (user) {
                return {
                    id: `user.${user.slug}`,
                    title: user.name,
                    category: 'Users'
                };
            }));
        });
    },

    _loadTags: function () {
        var store = this.get('_store'),
            tagsUrl = store.adapterFor('tag').urlForQuery({}, 'tag') + '/',
            tagsQuery = {fields: 'name,slug', limit: 'all'},
            content = this.get('content'),
            self = this;

        return ajax(tagsUrl, {data: tagsQuery}).then(function (tags) {
            content.removeObjects(self.get('tags'));
            content.pushObjects(tags.tags.map(function (tag) {
                return {
                    id: `tag.${tag.slug}`,
                    title: tag.name,
                    category: 'Tags'
                };
            }));
        });
    },

    _keepSelectionClear: Ember.observer('selection', function () {
        if (this.get('selection') !== null) {
            this.set('selection', null);
        }
    }),

    _setKeymasterScope: function () {
        key.setScope('search-input');
    },

    _resetKeymasterScope: function () {
        key.setScope('default');
    },

    willDestroy: function () {
        this._resetKeymasterScope();
    },

    actions: {
        openSelected: function (selected) {
            var transition = null,
                self = this;

            if (!selected) { return; }

            if (selected.category === 'Posts' || selected.category === 'Pages') {
                let id = selected.id.replace('post.', '');
                transition = self.get('_routing.router').transitionTo('editor.edit', id);
            }

            if (selected.category === 'Users') {
                let id = selected.id.replace('user.', '');
                transition = self.get('_routing.router').transitionTo('team.user', id);
            }

            if (selected.category === 'Tags') {
                let id = selected.id.replace('tag.', '');
                transition = self.get('_routing.router').transitionTo('settings.tags.tag', id);
            }

            transition.then(function () {
                if (self.get('_selectize').$control_input.is(':focus')) {
                    self._setKeymasterScope();
                }
            });
        },

        focusInput: function () {
            this.get('_selectize').focus();
        },

        onInit: function () {
            var selectize = this.get('_selectize'),
                html = '<div class="dropdown-empty-message">Nothing found&hellip;</div>';

            selectize.$empty_results_container = $(html);
            selectize.$empty_results_container.hide();
            selectize.$dropdown.append(selectize.$empty_results_container);
        },

        onFocus: function () {
            this._setKeymasterScope();
            this.refreshContent();
        },

        onBlur: function () {
            var selectize = this.get('_selectize');

            this._resetKeymasterScope();
            selectize.$empty_results_container.hide();
        },

        onType: function () {
            var selectize = this.get('_selectize');

            if (!selectize.hasOptions) {
                selectize.open();
                selectize.$empty_results_container.show();
            } else {
                selectize.$empty_results_container.hide();
            }
        }
    }

});
