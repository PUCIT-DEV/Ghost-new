/* eslint-disable no-unused-vars */

/**
 * @typedef {object} Post
 * @typedef {object} Email
 */

const BatchSendingService = require('./batch-sending-service');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const EmailRenderer = require('./email-renderer');

const messages = {
    archivedNewsletterError: 'Cannot send email to archived newsletters',
    missingNewsletterError: 'The post does not have a newsletter relation'
};

class EmailService {
    #batchSendingService;
    #models;
    #settingsCache;
    #emailRenderer;

    /**
     * 
     * @param {object} dependencies 
     * @param {BatchSendingService} dependencies.batchSendingService
     * @param {object} dependencies.models
     * @param {object} dependencies.models.Email
     * @param {object} dependencies.settingsCache
     * @param {EmailRenderer} dependencies.emailRenderer
     */
    constructor({
        batchSendingService,
        models,
        settingsCache,
        emailRenderer
    }) {
        this.#batchSendingService = batchSendingService;
        this.#models = models;
        this.#settingsCache = settingsCache;
        this.#emailRenderer = emailRenderer;
    }

    /**
     * 
     * @param {Post} post 
     * @returns {Promise<Email>}
     */
    async createEmail(post) {
        let newsletter = await post.getLazyRelation('newsletter');
        if (!newsletter) {
            throw new errors.EmailError({
                message: tpl(messages.missingNewsletterError)
            });
        }

        if (newsletter.get('status') !== 'active') {
            // A post might have been scheduled to an archived newsletter.
            // Don't send it (people can't unsubscribe any longer).
            throw new errors.EmailError({
                message: tpl(messages.archivedNewsletterError)
            });
        }

        const emailRecipientFilter = post.get('email_recipient_filter');

        const email = await this.#models.Email.add({
            post_id: post.id,
            newsletter_id: newsletter.id,
            status: 'pending',
            submitted_at: new Date(),
            track_opens: !!this.#settingsCache.get('email_track_opens'),
            track_clicks: !!this.#settingsCache.get('email_track_clicks'),
            feedback_enabled: !!newsletter.get('feedback_enabled'),
            recipient_filter: emailRecipientFilter,
            subject: this.#emailRenderer.getSubject(post, newsletter),
            from: this.#emailRenderer.getFromAddress(post, newsletter),
            replyTo: this.#emailRenderer.getReplyToAddress(post, newsletter),
            email_count: 1 // TODO
        });

        try {
            // TODO: Check limits here
            this.#batchSendingService.scheduleEmail(email);
        } catch (e) {
            await email.save({
                status: 'failed',
                error: e.message || 'Something went wrong while scheduling the email'
            }, {patch: true});
        }

        return email;
    }
    async retryEmail(email) {
        // TODO: check if email is failed before allowing retry
        this.#batchSendingService.scheduleEmail(email);
        return email;
    }

    async previewEmail(post, newsletter, segment) {
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('Previewing an email has not been implemented yet. Turn off the email stability flag is you need this functionality.');
    }

    async sendTestEmail(post, newsletter, segment, emails) {
        // eslint-disable-next-line no-restricted-syntax
        throw new Error('Sending a test email has not been implemented yet. Turn off the email stability flag is you need this functionality.');
    }
}

module.exports = EmailService;
