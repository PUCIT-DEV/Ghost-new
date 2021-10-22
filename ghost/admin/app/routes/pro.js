import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import {inject as service} from '@ember/service';

// TODO: rename billing route and service to /pro
export default AuthenticatedRoute.extend({
    billing: service(),
    session: service(),
    config: service(),

    queryParams: {
        action: {refreshModel: true}
    },

    beforeModel(transition) {
        this._super(...arguments);

        // allow non-owner users to access the BMA when we're in a force upgrade state
        if (!this.session.user.isOwnerOnly && !this.config.get('hostSettings.forceUpgrade')) {
            return this.transitionTo('home');
        }

        this.billing.set('previousTransition', transition);
    },

    model(params) {
        if (params.action) {
            this.billing.set('action', params.action);
        }

        this.billing.toggleProWindow(true);
    },

    actions: {
        willTransition(transition) {
            let isBillingTransition = false;

            if (transition) {
                let destinationUrl = (typeof transition.to === 'string')
                    ? transition.to
                    : (transition.intent
                        ? transition.intent.url
                        : '');

                if (destinationUrl?.includes('/pro')) {
                    isBillingTransition = true;
                }
            }

            this.billing.toggleProWindow(isBillingTransition);
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Ghost(Pro)'
        };
    }
});
