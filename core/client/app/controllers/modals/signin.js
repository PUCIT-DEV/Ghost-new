import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    needs: 'application',

    validationType: 'signin',

    identification: Ember.computed('session.user.email', function () {
        return this.get('session.user.email');
    }),

    actions: {
        authenticate: function () {
            var appController = this.get('controllers.application'),
                authStrategy = 'simple-auth-authenticator:oauth2-password-grant',
                data = this.getProperties('identification', 'password'),
                self = this;

            appController.set('skipAuthSuccessHandler', true);

            this.get('session').authenticate(authStrategy, data).then(function () {
                self.send('closeModal');
                self.notifications.showSuccess('Login successful.');
                self.set('password', '');
            }).catch(function () {
                // if authentication fails a rejected promise will be returned.
                // it needs to be caught so it doesn't generate an exception in the console,
                // but it's actually "handled" by the sessionAuthenticationFailed action handler.
            }).finally(function () {
                appController.set('skipAuthSuccessHandler', undefined);
            });
        },

        validateAndAuthenticate: function () {
            var self = this;

            // Manually trigger events for input fields, ensuring legacy compatibility with
            // browsers and password managers that don't send proper events on autofill
            $('#login').find('input').trigger('change');

            this.validate({format: false}).then(function () {
                self.notifications.closePassive();
                self.send('authenticate');
            }).catch(function (errors) {
                self.notifications.showErrors(errors);
            });
        },

        confirmAccept: function () {
            this.send('validateAndAuthenticate');
        }
    }
});
