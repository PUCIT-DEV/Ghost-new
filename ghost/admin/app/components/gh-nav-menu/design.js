import Component from '@glimmer/component';
import {TrackedSet} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class DesignMenuComponent extends Component {
    @service config;
    @service customThemeSettings;
    @service router;
    @service settings;
    @service themeManagement;

    @tracked openSections = new TrackedSet();

    KNOWN_GROUPS = [{
        key: 'homepage',
        name: 'Homepage',
        icon: 'house'
    }, {
        key: 'post',
        name: 'Post',
        icon: 'house'
    }];

    constructor() {
        super(...arguments);
        this.fetchThemeSettingsTask.perform();
        this.themeManagement.updatePreviewHtmlTask.perform();
    }

    get themeSettings() {
        return this.customThemeSettings.settings;
    }

    get settingGroups() {
        const groupKeys = this.KNOWN_GROUPS.map(g => g.key);

        const groups = [{
            key: 'site-wide',
            name: 'Site-wide',
            icon: 'house',
            settings: this.themeSettings.filter(setting => !groupKeys.includes(setting.group))
        }];

        this.KNOWN_GROUPS.forEach((knownGroup) => {
            groups.push(Object.assign({}, knownGroup, {
                settings: this.themeSettings.filter(setting => setting.group === knownGroup.key)
            }));
        });

        return groups;
    }

    @action
    toggleSection(section) {
        this.openSections.has(section) ? this.openSections.delete(section) : this.openSections.add(section);
    }

    @task
    *fetchThemeSettingsTask() {
        yield this.customThemeSettings.load();
    }

    @action
    transitionBackToIndex() {
        if (this.router.currentRouteName !== 'settings.design.index') {
            this.router.transitionTo('settings.design.index');
        }
    }
}
