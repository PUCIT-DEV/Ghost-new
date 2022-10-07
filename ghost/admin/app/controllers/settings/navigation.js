import classic from 'ember-classic-decorator';
import {action, computed} from '@ember/object';
import {inject as service} from '@ember/service';
/* eslint-disable ghost/ember/alias-model-in-controller */
import $ from 'jquery';
import Controller from '@ember/controller';
import NavigationItem from 'ghost-admin/models/navigation-item';
import RSVP from 'rsvp';
import {task} from 'ember-concurrency';

@classic
export default class NavigationController extends Controller {
    @service config;
    @service ghostPaths;
    @service notifications;
    @service session;
    @service settings;

    dirtyAttributes = false;
    newNavItem = null;
    newSecondaryNavItem = null;

    init() {
        super.init(...arguments);
        this.set('newNavItem', NavigationItem.create({isNew: true}));
        this.set('newSecondaryNavItem', NavigationItem.create({isNew: true, isSecondary: true}));
    }

    @computed('config.blogUrl')
    get blogUrl() {
        let url = this.get('config.blogUrl');

        return url.slice(-1) !== '/' ? `${url}/` : url;
    }

    @action
    save() {
        this.saveTask.perform();
    }

    @action
    addNavItem(item) {
        // If the url sent through is blank (user never edited the url)
        if (item.get('url') === '') {
            item.set('url', '/');
        }

        return item.validate().then(() => {
            this.addNewNavItem(item);
        });
    }

    @action
    deleteNavItem(item) {
        if (!item) {
            return;
        }

        let navItems = item.isSecondary ? this.settings.secondaryNavigation : this.settings.navigation;

        navItems.removeObject(item);
        this.set('dirtyAttributes', true);
    }

    @action
    updateLabel(label, navItem) {
        if (!navItem) {
            return;
        }

        if (navItem.get('label') !== label) {
            navItem.set('label', label);
            this.set('dirtyAttributes', true);
        }
    }

    @action
    updateUrl(url, navItem) {
        if (!navItem) {
            return;
        }

        if (navItem.get('url') !== url) {
            navItem.set('url', url);
            this.set('dirtyAttributes', true);
        }

        return url;
    }

    @action
    reset() {
        this.set('newNavItem', NavigationItem.create({isNew: true}));
        this.set('newSecondaryNavItem', NavigationItem.create({isNew: true, isSecondary: true}));
    }

    addNewNavItem(item) {
        let navItems = item.isSecondary ? this.settings.secondaryNavigation : this.settings.navigation;

        item.set('isNew', false);
        navItems.pushObject(item);
        this.set('dirtyAttributes', true);

        if (item.isSecondary) {
            this.set('newSecondaryNavItem', NavigationItem.create({isNew: true, isSecondary: true}));
            $('.gh-blognav-container:last .gh-blognav-line:last input:first').focus();
        } else {
            this.set('newNavItem', NavigationItem.create({isNew: true}));
            $('.gh-blognav-container:first .gh-blognav-line:last input:first').focus();
        }
    }

    @task
    *saveTask() {
        let navItems = this.settings.navigation;
        let secondaryNavItems = this.settings.secondaryNavigation;

        let notifications = this.notifications;
        let validationPromises = [];

        if (!this.newNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addNavItem', this.newNavItem));
        }

        if (!this.newSecondaryNavItem.get('isBlank')) {
            validationPromises.pushObject(this.send('addNavItem', this.newSecondaryNavItem));
        }

        navItems.forEach((item) => {
            validationPromises.pushObject(item.validate());
        });

        secondaryNavItems.forEach((item) => {
            validationPromises.pushObject(item.validate());
        });

        try {
            yield RSVP.all(validationPromises);
            this.set('dirtyAttributes', false);
            return yield this.settings.save();
        } catch (error) {
            if (error) {
                notifications.showAPIError(error);
                throw error;
            }
        }
    }
}
