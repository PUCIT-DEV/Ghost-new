import AuthenticatedRoute from 'ghost/routes/authenticated';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

var paginationSettings,
    UsersIndexRoute;

paginationSettings = {
    page: 1,
    limit: 20,
    status: 'active'
};

UsersIndexRoute = AuthenticatedRoute.extend(styleBody, PaginationRouteMixin, CurrentUserSettings, {
    classNames: ['settings-view-users'],

    setupController: function (controller, model) {
        this._super(controller, model);
        this.setupPagination(paginationSettings);
    },

    afterModel: function () {
        return this.currentUser()
            .then(this.transitionAuthor());
    },

    model: function () {
        var self = this;

        return self.store.find('user', {limit: 'all', status: 'invited'}).then(function () {
            return self.store.find('user', 'me').then(function (currentUser) {
                if (currentUser.get('isEditor')) {
                    // Editors only see authors in the list
                    paginationSettings.role = 'Author';
                }

                return self.store.filter('user', paginationSettings, function (user) {
                    if (currentUser.get('isEditor')) {
                        return user.get('isAuthor');
                    }
                    return true;
                });
            });
        });
    },

    actions: {
        reload: function () {
            this.refresh();
        }
    }
});

export default UsersIndexRoute;
