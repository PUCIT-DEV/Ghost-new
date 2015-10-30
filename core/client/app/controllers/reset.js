import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    newPassword: '',
    ne2Password: '',
    token: '',
    submitting: false,
    flowErrors: '',

    validationType: 'reset',

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),
    session: Ember.inject.service(),

    email: Ember.computed('token', function () {
        // The token base64 encodes the email (and some other stuff),
        // each section is divided by a '|'. Email comes second.
        return atob(this.get('token')).split('|')[1];
    }),

    // Used to clear sensitive information
    clearData: function () {
        this.setProperties({
            newPassword: '',
            ne2Password: '',
            token: ''
        });
    },

    actions: {
        submit: function () {
            var credentials = this.getProperties('newPassword', 'ne2Password', 'token'),
                self = this;
            this.set('flowErrors', '');
            this.get('hasValidated').addObjects((['newPassword', 'ne2Password']));
            this.validate().then(function () {
                self.toggleProperty('submitting');
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                    type: 'PUT',
                    data: {
                        passwordreset: [credentials]
                    }
                }).then(function (resp) {
                    self.toggleProperty('submitting');
                    self.get('notifications').showAlert(resp.passwordreset[0].message, {type: 'warn', delayed: true, key: 'password.reset'});
                    self.get('session').authenticate('authenticator:oauth2', self.get('email'), credentials.newPassword);
                }).catch(function (response) {
                    self.get('notifications').showAPIError(response, {key: 'password.reset'});
                    self.toggleProperty('submitting');
                });
            }).catch(function () {
                if (self.get('errors.newPassword')) {
                    self.set('flowErrors', self.get('errors.newPassword')[0].message);
                }

                if (self.get('errors.ne2Password')) {
                    self.set('flowErrors', self.get('errors.ne2Password')[0].message);
                }
            });
        }
    }
});
