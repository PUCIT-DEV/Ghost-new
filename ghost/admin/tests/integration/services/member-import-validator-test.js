import Pretender from 'pretender';
import Service from '@ember/service';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

let MembersUtilsStub = Service.extend({
    isStripeEnabled: () => (true)
});

describe('Integration: Service: member-import-validator', function () {
    setupTest();

    let server;

    beforeEach(function () {
        server = new Pretender();
        this.owner.register('service:membersUtils', MembersUtilsStub);
    });

    afterEach(function () {
        server.shutdown();
    });

    it('checks correct data without Stripe customer', async function () {
        let service = this.owner.lookup('service:member-import-validator');

        const result = await service.check([{
            name: 'Rish',
            email: 'validemail@example.com'
        }]);

        expect(result).to.equal(true);
    });

    it('returns validation error when no data is provided', async function () {
        let service = this.owner.lookup('service:member-import-validator');

        const result = await service.check([]);

        expect(result.length).to.equal(1);
        expect(result[0].message).to.equal('No data present in selected file.');
    });

    it('returns validation error for data with invalid email', async function () {
        let service = this.owner.lookup('service:member-import-validator');

        const result = await service.check([{
            name: 'Egg',
            email: 'notAnEmail'
        }]);

        expect(result.length).to.equal(1);
        expect(result[0].message).to.equal('Emails in provided data don\'t appear to be valid email addresses.');
    });

    it('returns validation error for data with stripe_customer_id but no connected Stripe', async function () {
        this.owner.register('service:membersUtils', Service.extend({
            isStripeEnabled: () => (false)
        }));

        let service = this.owner.lookup('service:member-import-validator');

        const result = await service.check([{
            name: 'Kevin',
            email: 'goodeamil@example.com',
            stripe_customer_id: 'cus_XXXX'
        }]);

        expect(result.length).to.equal(1);
        expect(result[0].message).to.equal('Stripe customer IDs exist in the data, but no stripe account is connected.');
    });
});
