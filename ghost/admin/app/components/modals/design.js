import Component from '@glimmer/component';
import config from 'ghost-admin/config/environment';
import {TrackedSet} from 'tracked-built-ins';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {tracked} from '@glimmer/tracking';

export default class ModalsDesignCustomizeComponent extends Component {
    @service ajax;
    @service config;
    @service customThemeSettings;
    @service settings;

    @tracked openSections = new TrackedSet();

    previewIframe = null;

    constructor() {
        super(...arguments);
        this.fetchThemeSettingsTask.perform();
    }

    get themeSettings() {
        return this.customThemeSettings.settings;
    }

    get siteWideSettings() {
        return this.customThemeSettings.settings.filter(setting => !setting.group);
    }

    get homepageSettings() {
        return this.customThemeSettings.settings.filter(setting => setting.group === 'home');
    }

    get postPageSettings() {
        return this.customThemeSettings.settings.filter(setting => setting.group === 'post');
    }

    get previewData() {
        const params = new URLSearchParams();

        params.append('c', this.settings.get('accentColor') || '#ffffff');
        params.append('d', this.settings.get('description'));
        params.append('icon', this.settings.get('icon'));
        params.append('logo', this.settings.get('logo'));
        params.append('cover', this.settings.get('coverImage'));

        params.append('custom', JSON.stringify(this.customThemeSettings.keyValueObject));

        return params.toString();
    }

    @action
    toggleSection(section) {
        this.openSections.has(section) ? this.openSections.delete(section) : this.openSections.add(section);
    }

    @action
    registerPreviewIframe(iframe) {
        this.previewIframe = iframe;
        this.updatePreviewTask.perform();
    }

    @action
    replacePreviewContents(html) {
        if (this.previewIframe) {
            this.previewIframe.contentWindow.document.open();
            this.previewIframe.contentWindow.document.write(html);
            this.previewIframe.contentWindow.document.close();
        }
    }

    @task
    *fetchThemeSettingsTask() {
        yield this.customThemeSettings.load();
    }

    @task
    *updatePreviewTask() {
        // skip during testing because we don't have mocks for the front-end
        if (config.environment === 'test' || !this.previewIframe) {
            return;
        }

        // grab the preview html
        const ajaxOptions = {
            contentType: 'text/html;charset=utf-8',
            dataType: 'text',
            headers: {
                'x-ghost-preview': this.previewData
            }
        };

        // TODO: config.blogUrl always removes trailing slash - switch to always have trailing slash
        const frontendUrl = `${this.config.get('blogUrl')}/`;
        const previewContents = yield this.ajax.post(frontendUrl, ajaxOptions);

        // inject extra CSS to disable navigation and prevent clicks
        const injectedCss = `html { pointer-events: none; }`;

        const domParser = new DOMParser();
        const htmlDoc = domParser.parseFromString(previewContents, 'text/html');

        const stylesheet = htmlDoc.querySelector('style');
        const originalCSS = stylesheet.innerHTML;
        stylesheet.innerHTML = `${originalCSS}\n\n${injectedCss}`;

        // replace the iframe contents with the doctored preview html
        this.replacePreviewContents(htmlDoc.documentElement.innerHTML);
    }
}
