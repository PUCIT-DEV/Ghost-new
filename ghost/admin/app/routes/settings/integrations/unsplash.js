import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import CurrentUserSettings from '../../../mixins/current-user-settings';
import UnsplashObject from 'ghost-admin/models/unsplash-integration';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    config: service(),
    settings: service(),

    titleToken: 'Unsplash',
    classNames: ['settings-view-integrations-unsplash'],

    // reload settings to ensure we have latest values and pre-configure
    // Unsplash to be active if the server doesn't have any unsplash setting
    beforeModel() {
        this._super(...arguments);
        let {settings} = this;

        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor())
            .then(this.settings.reload())
            .then(() => {
                if (settings.get('unsplash')) {
                    return;
                }

                // server doesn't have any unsplash settings by default but it can provide
                // overrides via config:
                // - isActive: use as default but allow settings override
                // - applicationId: total override, no field is shown if present
                let unsplash = UnsplashObject.create({
                    isActive: true
                });

                settings.set('unsplash', unsplash);
            });
    },

    actions: {
        save() {
            this.controller.send('save');
        },

        willTransition(transition) {
            let controller = this.controller;
            let modelIsDirty = controller.dirtyAttributes;

            if (modelIsDirty) {
                transition.abort();
                controller.send('toggleLeaveSettingsModal', transition);
                return;
            }
        }
    }
});
