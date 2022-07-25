const {SafeString} = require('../services/handlebars');
const {urlUtils, getFrontendKey, labs, settingsCache} = require('../services/proxy');
const {getFrontendAppConfig, getDataAttributes} = require('../utils/frontend-apps');

async function comments(options) {
    // todo: For now check on the comment id to exclude normal pages (we probably have a better way to do this)

    const commentId = this.comment_id;

    if (!commentId) {
        return;
    }

    /**
     * We need to check if comments enabled, because the theme might not be using the other available helpers to check
     * if comments is enabled + the member has access
     * @type {'all'|'paid'|'off'}
     */
    const commentsEnabled = settingsCache.get('comments_enabled');
    const hasAccess = !!this.access;

    if (commentsEnabled === 'off' || !hasAccess) {
        return;
    }

    let colorScheme = 'auto';
    if (options.hash.color_scheme === 'dark' || options.hash.color_scheme === 'light') {
        colorScheme = options.hash.color_scheme;
    }

    let avatarSaturation = parseInt(options.hash.avatar_saturation);
    if (isNaN(avatarSaturation)) {
        avatarSaturation = 50;
    }

    let accentColor = '';
    if (options.data.site.accent_color) {
        accentColor = options.data.site.accent_color;
    }

    const frontendKey = await getFrontendKey();
    const {scriptUrl, stylesUrl, appVersion} = getFrontendAppConfig('comments');

    const data = {
        'ghost-comments': urlUtils.getSiteUrl(),
        api: urlUtils.urlFor('api', {type: 'content'}, true),
        admin: urlUtils.urlFor('admin', true),
        key: frontendKey,
        styles: stylesUrl,
        'post-id': this.id,
        'sentry-dsn': '', /* todo: insert sentry dsn key here */
        'color-scheme': colorScheme,
        'avatar-saturation': avatarSaturation,
        'accent-color': accentColor,
        'app-version': appVersion,
        'comments-enabled': commentsEnabled
    };

    const dataAttributes = getDataAttributes(data);

    return new SafeString(`
        <script defer src="${scriptUrl}" ${dataAttributes} crossorigin="anonymous"></script>
    `);
}

module.exports = async function commentsLabsWrapper() {
    const self = this;
    const args = arguments;

    return labs.enabledHelper({
        flagKey: 'comments',
        flagName: 'Comments',
        helperName: 'comments'
    }, () => {
        return comments.apply(self, args);
    });
};

module.exports.async = true;
