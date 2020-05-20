import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class MembersRoute extends AuthenticatedRoute {
    @service config;

    queryParams = {
        label: {refreshModel: true}
    };

    // redirect to posts screen if:
    // - TODO: members is disabled?
    // - logged in user isn't owner/admin
    beforeModel() {
        super.beforeModel(...arguments);
        return this.session.user.then((user) => {
            if (!user.isOwnerOrAdmin) {
                return this.transitionTo('home');
            }
        });
    }

    // trigger a background load of members plus labels for filter dropdown
    setupController(controller) {
        super.setupController(...arguments);
        controller.fetchMembersTask.perform();
        controller.fetchLabelsTask.perform();
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Members'
        };
    }
}
