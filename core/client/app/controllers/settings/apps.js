import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';

const {
    Controller,
    computed
} = Ember;
const {alias} = computed;

export default Controller.extend(SettingsSaveMixin, {

    settings: alias('model'),

    slack: alias('settings.slack'),

    save() {
        let notifications = this.get('notifications');

        return this.get('settings').save().then(() => {
            this.notifyPropertyChange('settings.slack');
        }).catch((err) => {
            notifications.showErrors(err);
        });
    }

});
