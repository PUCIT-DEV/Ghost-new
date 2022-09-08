import AdminRoute from 'ghost-admin/routes/admin';
import {inject as service} from '@ember/service';

export default class HistoryRoute extends AdminRoute {
    @service feature;

    beforeModel() {
        super.beforeModel(...arguments);
        if (!this.feature.auditLog) {
            return this.transitionTo('home');
        }
    }

    buildRouteInfoMetadata() {
        return {
            titleToken: 'History log'
        };
    }
}
