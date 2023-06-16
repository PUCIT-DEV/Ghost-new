/**
 * @typedef {import('@tryghost/mail-events').MailEventRepository} MailEventRepository
 * @typedef {import('@tryghost/mail-events').MailEvent} MailEvent
 */

/**
 * @implements MailEventRepository
 */
module.exports = class BookshelfMailEventRepository {
    /**
     * @type {Object}
     */
    #MailEventModel;

    /**
     * @param {object} MailEventModel
     */
    constructor(MailEventModel) {
        this.#MailEventModel = MailEventModel;
    }

    /**
     * @param {MailEvent} mailEvent
     * @returns {Promise<void>}
     */
    async save(mailEvent) {
        await this.#MailEventModel.add({
            id: mailEvent.id,
            type: mailEvent.type,
            message_id: mailEvent.messageId,
            recipient: mailEvent.recipient,
            occurred_at: new Date(mailEvent.timestampMs)
        });
    }
};
