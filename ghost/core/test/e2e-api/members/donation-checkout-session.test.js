const {agentProvider, mockManager, fixtureManager} = require('../../utils/e2e-framework');
const {stripeMocker} = require('../../utils/e2e-framework-mock-manager');
const models = require('../../../core/server/models');
const assert = require('assert/strict');
const urlService = require('../../../core/server/services/url');
const DomainEvents = require('@tryghost/domain-events');

let membersAgent, adminAgent;

async function getPost(id) {
    // eslint-disable-next-line dot-notation
    return await models['Post'].where('id', id).fetch({require: true});
}

describe('Create Stripe Checkout Session for Donations', function () {
    before(async function () {
        const agents = await agentProvider.getAgentsForMembers();
        membersAgent = agents.membersAgent;
        adminAgent = agents.adminAgent;

        await fixtureManager.init('posts', 'members');
        await adminAgent.loginAsOwner();
    });

    beforeEach(function () {
        mockManager.mockStripe();
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    it('Can create an anonymous checkout session for a donation', async function () {
        // Fake a visit to a post
        const post = await getPost(fixtureManager.get('posts', 0).id);
        const url = urlService.getUrlByResourceId(post.id, {absolute: false});

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                customerEmail: 'paid@test.com',
                type: 'donation',
                successUrl: 'https://example.com/?type=success',
                cancelUrl: 'https://example.com/?type=cancel',
                metadata: {
                    test: 'hello',
                    urlHistory: [
                        {
                            path: url,
                            time: Date.now(),
                            referrerMedium: null,
                            referrerSource: 'ghost-explore',
                            referrerUrl: 'https://example.com/blog/'
                        }
                    ]
                }
            })
            .expectStatus(200)
            .matchBodySnapshot();

        // Send a webhook of a paid invoice for this session
        await stripeMocker.sendWebhook({
            type: 'invoice.payment_succeeded',
            data: {
                object: {
                    type: 'invoice',
                    paid: true,
                    amount_paid: 1200,
                    currency: 'usd',
                    customer: (stripeMocker.checkoutSessions[0].customer),
                    customer_name: 'Paid Test',
                    customer_email: 'exampledonation@example.com',
                    metadata: {
                        ...(stripeMocker.checkoutSessions[0].invoice_creation?.invoice_data?.metadata ?? {})
                    }
                }
            }
        });

        // Check email received
        mockManager.assert.sentEmail({
            subject: '💰 One-time payment received: $12.00 from Paid Test',
            to: 'jbloggs@example.com'
        });

        // Check stored in database
        const lastDonation = await models.DonationPaymentEvent.findOne({
            email: 'exampledonation@example.com'
        }, {require: true});
        assert.equal(lastDonation.get('amount'), 1200);
        assert.equal(lastDonation.get('currency'), 'usd');
        assert.equal(lastDonation.get('email'), 'exampledonation@example.com');
        assert.equal(lastDonation.get('name'), 'Paid Test');
        assert.equal(lastDonation.get('member_id'), null);

        // Check referrer
        assert.equal(lastDonation.get('referrer_url'), 'example.com');
        assert.equal(lastDonation.get('referrer_medium'), 'Ghost Network');
        assert.equal(lastDonation.get('referrer_source'), 'Ghost Explore');

        // Check attributed correctly
        assert.equal(lastDonation.get('attribution_id'), post.id);
        assert.equal(lastDonation.get('attribution_type'), 'post');
        assert.equal(lastDonation.get('attribution_url'), url);
    });

    it('Can create a member checkout session for a donation', async function () {
        // Fake a visit to a post
        const post = await getPost(fixtureManager.get('posts', 0).id);
        const url = urlService.getUrlByResourceId(post.id, {absolute: false});

        const email = 'test-member-create-donation-session@email.com';

        const membersService = require('../../../core/server/services/members');
        const member = await membersService.api.members.create({email, name: 'Member Test'});
        const token = await membersService.api.getMemberIdentityToken(email);

        await DomainEvents.allSettled();

        // Check email received
        mockManager.assert.sentEmail({
            subject: '🥳 Free member signup: Member Test',
            to: 'jbloggs@example.com'
        });

        await membersAgent.post('/api/create-stripe-checkout-session/')
            .body({
                customerEmail: email,
                identity: token,
                type: 'donation',
                successUrl: 'https://example.com/?type=success',
                cancelUrl: 'https://example.com/?type=cancel',
                metadata: {
                    test: 'hello',
                    urlHistory: [
                        {
                            path: url,
                            time: Date.now(),
                            referrerMedium: null,
                            referrerSource: 'ghost-explore',
                            referrerUrl: 'https://example.com/blog/'
                        }
                    ]
                }
            })
            .expectStatus(200)
            .matchBodySnapshot();

        // Send a webhook of a paid invoice for this session
        await stripeMocker.sendWebhook({
            type: 'invoice.payment_succeeded',
            data: {
                object: {
                    type: 'invoice',
                    paid: true,
                    amount_paid: 1220,
                    currency: 'eur',
                    customer: (stripeMocker.checkoutSessions[0].customer),
                    customer_name: 'Member Test',
                    customer_email: email,
                    metadata: {
                        ...(stripeMocker.checkoutSessions[0].invoice_creation?.invoice_data?.metadata ?? {})
                    }
                }
            }
        });

        // Check email received
        mockManager.assert.sentEmail({
            subject: '💰 One-time payment received: €12.20 from Member Test',
            to: 'jbloggs@example.com'
        });

        // Check stored in database
        const lastDonation = await models.DonationPaymentEvent.findOne({
            email
        }, {require: true});
        assert.equal(lastDonation.get('amount'), 1220);
        assert.equal(lastDonation.get('currency'), 'eur');
        assert.equal(lastDonation.get('email'), email);
        assert.equal(lastDonation.get('name'), 'Member Test');
        assert.equal(lastDonation.get('member_id'), member.id);

        // Check referrer
        assert.equal(lastDonation.get('referrer_url'), 'example.com');
        assert.equal(lastDonation.get('referrer_medium'), 'Ghost Network');
        assert.equal(lastDonation.get('referrer_source'), 'Ghost Explore');

        // Check attributed correctly
        assert.equal(lastDonation.get('attribution_id'), post.id);
        assert.equal(lastDonation.get('attribution_type'), 'post');
        assert.equal(lastDonation.get('attribution_url'), url);
    });
});
