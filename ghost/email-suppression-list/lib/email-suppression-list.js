const assert = require('assert');

/**
 * @typedef {object} EmailSuppressionInfo
 * @prop {'spam' | 'failed'} reason
 * @prop {Date} timestamp
 */

/**
 * @typedef {object} EmailSuppressedData
 * @prop {true} suppressed
 * @prop {EmailSuppressionInfo} info
 */

/**
 * @typedef {object} EmailNotSuppressedData
 * @prop {false} suppressed
 * @prop {null} info
 */

/**
 * @typedef {EmailSuppressedData | EmailNotSuppressedData} IEmailSuppressionData
 */

/**
 * @typedef {object} IEmailSuppressionList
 * @prop {(email: string) => Promise<EmailSuppressionData>} getSuppressionData
 * @prop {(emails: string[]) => Promise<EmailSuppressionData[]>} getBulkSuppressionData
 * @prop {(email: string) => Promise<boolean>} removeEmail
 */

/**
 * @implements {IEmailSuppressionData}
 */
class EmailSuppressionData {
    /** @type {boolean} */
    suppressed;
    /** @type {EmailSuppressionInfo | null} */
    info;

    constructor(suppressed, info) {
        if (!suppressed) {
            this.suppressed = false;
            this.info = null;
        } else {
            this.suppressed = true;
            assert(info.reason === 'spam' || info.reason === 'fail');
            assert(info.timestamp instanceof Date);
            this.info = {
                reason: info.reason,
                timestamp: info.timestamp
            };
        }
    }
}

/**
 * @abstract
 * @implements {IEmailSuppressionList}
 */
class AbstractEmailSuppressionList {
    /**
     * @param {string} email
     * @returns {Promise<boolean>}
     */
    async removeEmail(email) {
        return Promise.reject();
    }

    /**
     * @param {string} email
     * @returns {Promise<EmailSuppressionData>}
     */
    async getSuppressionData(email) {
        return Promise.reject();
    }

    /**
     * @param {string[]} emails
     * @returns {Promise<EmailSuppressionData[]>}
     */
    async getBulkSuppressionData(emails) {
        return Promise.all(emails.map(email => this.getSuppressionData(email)));
    }
}

module.exports = {
    AbstractEmailSuppressionList,
    EmailSuppressionData
};
