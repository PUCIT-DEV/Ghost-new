import AuthenticatedRoute from 'ghost/routes/authenticated';
import CurrentUserSettings from 'ghost/mixins/current-user-settings';
import styleBody from 'ghost/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, CurrentUserSettings, {
    titleToken: 'Settings - Code Injection',
    classNames: ['settings-view-code'],

    beforeModel: function (transition) {
        this._super(transition);
        return this.get('session.user')
            .then(this.transitionAuthor())
            .then(this.transitionEditor());
    },

    model: function () {
        return this.store.query('setting', {type: 'blog,theme'}).then(function (records) {
            return records.get('firstObject');
        });
    },

    actions: {
        save: function () {
            this.get('controller').send('save');
        }
    }
});
