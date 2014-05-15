import Resolver from 'ember/resolver';
import initFixtures from 'ghost/fixtures/init';
import {currentUser, injectCurrentUser} from 'ghost/initializers/current-user';
import {registerNotifications, injectNotifications} from 'ghost/initializers/notifications';
import injectGhostPaths from 'ghost/initializers/ghost-paths';
import 'ghost/utils/link-view';
import 'ghost/utils/text-field';

var App = Ember.Application.extend({
    /**
     * These are debugging flags, they are useful during development
     */
    LOG_ACTIVE_GENERATION: true,
    LOG_MODULE_RESOLVER: true,
    LOG_TRANSITIONS: true,
    LOG_TRANSITIONS_INTERNAL: true,
    LOG_VIEW_LOOKUPS: true,
    modulePrefix: 'ghost',
    Resolver: Resolver['default']
});

initFixtures();

App.initializer(currentUser);
App.initializer(injectCurrentUser);
App.initializer(injectGhostPaths);
App.initializer(registerNotifications);
App.initializer(injectNotifications);

export default App;
