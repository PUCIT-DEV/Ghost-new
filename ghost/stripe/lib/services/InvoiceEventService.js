const errors = require('@tryghost/errors');
// const _ = require('lodash');

module.exports = class InvoiceEventService {
    constructor({memberRepository, eventRepository, productRepository, api}) {
        this.memberRepository = memberRepository;
        this.eventRepository = eventRepository;
        this.productRepository = productRepository;
        this.api = api;
    }

    async handleInvoiceEvent(invoice) {
        if (!invoice.subscription) {
            // Check if this is a one time payment, related to a donation
            // this is being handled in checkoutSessionEvent because we need to handle the custom donation message
            // which is not available in the invoice object
            return;
        }
        const subscription = await this.api.getSubscription(invoice.subscription, {
            expand: ['default_payment_method']
        });

        const member = await this.memberRepository.get({
            customer_id: subscription.customer
        });

        if (member) {
            if (invoice.paid && invoice.amount_paid !== 0) {
                await this.eventRepository.registerPayment({
                    member_id: member.id,
                    currency: invoice.currency,
                    amount: invoice.amount_paid
                });
            }
        } else {
            // Subscription has more than one plan - meaning it is not one created by us - ignore.
            if (!subscription.plan) {
                return;
            }
            // Subscription is for a different product - ignore.
            const product = await this.productRepository.get({
                stripe_product_id: subscription.plan.product
            });
            if (!product) {
                return;
            }
            // Could not find the member, which we need in order to insert an payment event.
            throw new errors.NotFoundError({
                message: `No member found for customer ${subscription.customer}`
            });
        }
    }
};
