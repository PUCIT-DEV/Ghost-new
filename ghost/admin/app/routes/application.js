import * as Sentry from '@sentry/ember';
import AuthConfiguration from 'ember-simple-auth/configuration';
import React from 'react';
import ReactDOM from 'react-dom';
import Route from '@ember/routing/route';
import ShortcutsRoute from 'ghost-admin/mixins/shortcuts-route';
import ctrlOrCmd from 'ghost-admin/utils/ctrl-or-cmd';
import windowProxy from 'ghost-admin/utils/window-proxy';
import {Debug} from '@sentry/integrations';
import {importSettings} from '../components/admin-x/settings';
import {inject} from 'ghost-admin/decorators/inject';
import {
    isAjaxError,
    isNotFoundError,
    isUnauthorizedError
} from 'ember-ajax/errors';
import {isArray as isEmberArray} from '@ember/array';
import {
    isMaintenanceError,
    isVersionMismatchError
} from 'ghost-admin/services/ajax';
import {later} from '@ember/runloop';
import {inject as service} from '@ember/service';

function K() {
    return this;
}

let shortcuts = {};

shortcuts.esc = {action: 'closeMenus', scope: 'default'};
shortcuts[`${ctrlOrCmd}+s`] = {action: 'save', scope: 'all'};

// make globals available for any pulled in UMD components
// - avoids external components needing to bundle React and running into multiple version errors
window.React = React;
window.ReactDOM = ReactDOM;

export default Route.extend(ShortcutsRoute, {
    ajax: service(),
    configManager: service(),
    feature: service(),
    ghostPaths: service(),
    notifications: service(),
    router: service(),
    session: service(),
    settings: service(),
    ui: service(),
    whatsNew: service(),
    billing: service(),

    shortcuts,

    routeAfterAuthentication: 'home',

    init() {
        this._super(...arguments);

        this.router.on('routeDidChange', () => {
            this.notifications.displayDelayed();
        });

        this.ui.initBodyDragHandlers();
    },

    config: inject(),

    async beforeModel() {
        await this.session.setup();
        return this.prepareApp();
    },

    async afterModel(model, transition) {
        this._super(...arguments);

        if (this.get('session.isAuthenticated')) {
            this.session.appLoadTransition = transition;
        }

        this._appLoaded = true;
    },

    actions: {
        closeMenus() {
            this.ui.closeMenus();
        },

        didTransition() {
            this.session.appLoadTransition = null;
            this.send('closeMenus');

            // Need a tiny delay here to allow the router to update to the current route
            later(() => {
                Sentry.setTag('route', this.router.currentRouteName);
            }, 2);
        },

        authorizationFailed() {
            windowProxy.replaceLocation(AuthConfiguration.rootURL);
        },

        // noop default for unhandled save (used from shortcuts)
        save: K,

        error(error, transition) {
            // unauthoirized errors are already handled in the ajax service
            if (isUnauthorizedError(error)) {
                return false;
            }

            if (isNotFoundError(error)) {
                if (transition) {
                    transition.abort();
                }

                let routeInfo = transition.to;
                let router = this.router;
                let params = [];

                for (let key of Object.keys(routeInfo.params)) {
                    params.push(routeInfo.params[key]);
                }

                let url = router.urlFor(routeInfo.name, ...params)
                    .replace(/^#\//, '')
                    .replace(/^\//, '')
                    .replace(/^ghost\//, '');

                return this.replaceWith('error404', url);
            }

            if (isVersionMismatchError(error)) {
                if (transition) {
                    transition.abort();
                }

                this.upgradeStatus.requireUpgrade();

                if (this._appLoaded) {
                    return false;
                }
            }

            if (isMaintenanceError(error)) {
                if (transition) {
                    transition.abort();
                }

                this.upgradeStatus.maintenanceAlert();

                if (this._appLoaded) {
                    return false;
                }
            }

            if (isAjaxError(error) || error && error.payload && isEmberArray(error.payload.errors)) {
                this.notifications.showAPIError(error);
                // don't show the 500 page if we weren't navigating
                if (!transition) {
                    return false;
                }
            }

            // fallback to 500 error page
            return true;
        }
    },

    willDestroy() {
        this.ui.cleanupBodyDragHandlers();
    },

    async prepareApp() {
        await this.configManager.fetchUnauthenticated();

        // init Sentry here rather than app.js so that we can use API-supplied
        // sentry_dsn and sentry_env rather than building it into release assets
        if (this.config.sentry_dsn) {
            const sentryConfig = {
                dsn: this.config.sentry_dsn,
                environment: this.config.sentry_env,
                release: `ghost@${this.config.version}`,
                beforeSend(event, hint) {
                    const exception = hint.originalException;
                    event.tags = event.tags || {};
                    event.tags.shown_to_user = event.tags.shown_to_user || false;
                    event.tags.grammarly = !!document.querySelector('[data-gr-ext-installed]');

                    // Do not report "handled" errors to Sentry
                    if (event.tags.shown_to_user === true) {
                        return null;
                    }

                    // ajax errors — improve logging and add context for debugging
                    if (isAjaxError(exception)) {
                        const error = exception.payload.errors[0];
                        event.exception.values[0].type = `${error.type}: ${error.context}`;
                        event.exception.values[0].value = error.message;
                        event.exception.values[0].context = error.context;
                        event.tags.isAjaxError = true;
                    } else {
                        event.tags.isAjaxError = false;
                        delete event.contexts.ajax;
                        delete event.tags.ajaxStatus;
                        delete event.tags.ajaxMethod;
                        delete event.tags.ajaxUrl;
                    }

                    return event;
                },
                // TransitionAborted errors surface from normal application behaviour
                // - https://github.com/emberjs/ember.js/issues/12505
                ignoreErrors: [/^TransitionAborted$/]
            };
            if (this.config.sentry_env === 'development') {
                sentryConfig.integrations = [new Debug()];
            }
            Sentry.init(sentryConfig);
        }

        if (this.session.isAuthenticated) {
            try {
                await this.session.populateUser();
            } catch (e) {
                await this.session.invalidate();
            }

            await this.session.postAuthPreparation();
        }

        if (this.config.hostSettings?.forceUpgrade) {
            // enforce opening the BMA in a force upgrade state
            this.billing.openBillingWindow(this.router.currentURL, '/pro');
        }

        // Preload settings to avoid a delay when opening
        setTimeout(importSettings, 1000);
    }

});
