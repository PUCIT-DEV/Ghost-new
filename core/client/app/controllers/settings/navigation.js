import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';
import NavigationItem from 'ghost/models/navigation-item';

const {
    Controller,
    RSVP,
    computed,
    inject: {service}
} = Ember;

export default Controller.extend(SettingsSaveMixin, {
    config: service(),
    notifications: service(),

    newNavItem: null,

    blogUrl: computed('config.blogUrl', function () {
        let url = this.get('config.blogUrl');

        return url.slice(-1) !== '/' ? `${url}/` : url;
    }),

    init() {
        this._super(...arguments);
        this.set('newNavItem', NavigationItem.create({isNew: true}));
    },

    save() {
        let navItems = this.get('model.navigation');
        let newNavItem = this.get('newNavItem');
        let notifications = this.get('notifications');
        let validationPromises = [];

        if (!newNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addItem'));
        }

        navItems.map((item) => {
            validationPromises.pushObject(item.validate());
        });

        return RSVP.all(validationPromises).then(() => {
            return this.get('model').save().catch((err) => {
                notifications.showErrors(err);
            });
        }).catch(() => {
            // TODO: noop - needed to satisfy spinner button
        });
    },

    addNewNavItem() {
        let navItems = this.get('model.navigation');
        let newNavItem = this.get('newNavItem');

        newNavItem.set('isNew', false);
        navItems.pushObject(newNavItem);
        this.set('newNavItem', NavigationItem.create({isNew: true}));
    },

    actions: {
        addItem() {
            let newNavItem = this.get('newNavItem');

            // If the url sent through is blank (user never edited the url)
            if (newNavItem.get('url') === '') {
                newNavItem.set('url', '/');
            }

            return newNavItem.validate().then(() => {
                this.addNewNavItem();
            });
        },

        deleteItem(item) {
            if (!item) {
                return;
            }

            let navItems = this.get('model.navigation');

            navItems.removeObject(item);
        },

        reorderItems(navItems) {
            this.set('model.navigation', navItems);
        },

        updateUrl(url, navItem) {
            if (!navItem) {
                return;
            }

            navItem.set('url', url);
        },

        reset() {
            this.set('newNavItem', NavigationItem.create({isNew: true}));
        }
    }
});
