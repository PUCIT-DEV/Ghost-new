import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

export default class MembershipSettingsRoute extends AuthenticatedRoute {
    @service settings;

    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.session.user.isAdmin) {
            return this.transitionTo('home');
        }
    }

    model() {
        this.settings.reload();
    }

    actions = {
        willTransition(transition) {
            return this.controller.leaveRoute(transition);
        }
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Settings - Membership'
        };
    }

    resetController(controller, isExiting) {
        if (isExiting) {
            controller.reset();
        }
    }
}
