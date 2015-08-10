import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    // ValidationEngine settings
    validationType: 'signup',

    submitting: false,
    flowErrors: '',

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    actions: {
        signup: function () {
            var self = this,
                model = this.get('model'),
                data = model.getProperties('name', 'email', 'password', 'token'),
                notifications = this.get('notifications');

            this.set('flowErrors', '');
            notifications.closeNotifications();

            this.validate().then(function () {
                self.toggleProperty('submitting');
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'invitation'),
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        invitation: [{
                            name: data.name,
                            email: data.email,
                            password: data.password,
                            token: data.token
                        }]
                    }
                }).then(function () {
                    self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                        identification: self.get('model.email'),
                        password: self.get('model.password')
                    });
                }).catch(function (resp) {
                    self.toggleProperty('submitting');
                    if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
                        self.set('flowErrors', 'That email address is already in use.');
                    } else {
                        notifications.showAPIError(resp);
                    }
                });
            }).catch(function () {
                self.set('flowErrors', 'Please fill out the form to complete your sign-up');
            });
        }
    }
});
