import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import PaginationRouteMixin from 'ghost/mixins/pagination-route';
import styleBody from 'ghost/mixins/style-body';

var paginationSettings,
    TeamIndexRoute;

paginationSettings = {
    page: 1,
    limit: 20,
    status: 'active'
};

TeamIndexRoute = AuthenticatedRoute.extend(styleBody, CurrentUserSettings, PaginationRouteMixin, {
    titleToken: 'Team',

    classNames: ['view-users'],

    setupController: function (controller, model) {
        this._super(controller, model);
        this.setupPagination(paginationSettings);
    },

    beforeModel: function (transition) {
        this._super(transition);
        return this.get('session.user')
            .then(this.transitionAuthor());
    },

    model: function () {
        var self = this;

        return self.store.find('user', {limit: 'all', status: 'invited'}).then(function () {
            return self.get('session.user').then(function (currentUser) {
                if (currentUser.get('isEditor')) {
                    // Editors only see authors in the list
                    paginationSettings.role = 'Author';
                }

                return self.store.filter('user', paginationSettings, function (user) {
                    if (currentUser.get('isEditor')) {
                        return user.get('isAuthor') || user === currentUser;
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

export default TeamIndexRoute;
