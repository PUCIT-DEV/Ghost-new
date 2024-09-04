const chai = require('chai');
const sinon = require('sinon');
const {expect} = chai;
const errors = require('@tryghost/errors');

const InvoiceEventService = require('../../../../lib/services/InvoiceEventService');

describe('InvoiceEventService', function () {
    let memberRepositoryStub, eventRepositoryStub, productRepositoryStub, apiStub, service;

    beforeEach(function () {
        memberRepositoryStub = {
            get: sinon.stub()
        };
        eventRepositoryStub = {
            registerPayment: sinon.stub()
        };
        productRepositoryStub = {
            get: sinon.stub()
        };
        apiStub = {
            getSubscription: sinon.stub()
        };
        service = new InvoiceEventService({
            memberRepository: memberRepositoryStub,
            eventRepository: eventRepositoryStub,
            productRepository: productRepositoryStub,
            api: apiStub
        });
    });

    it('should return early if invoice does not have a subscription, because its probably a donation', async function () {
        const invoice = {subscription: null};

        await service.handleInvoiceEvent(invoice);

        sinon.assert.notCalled(apiStub.getSubscription);
        sinon.assert.notCalled(memberRepositoryStub.get);
        sinon.assert.notCalled(eventRepositoryStub.registerPayment);

        expect(apiStub.getSubscription.called).to.be.false;
    });

    it('should return early if invoice is a one-time payment', async function () {
        const invoice = {subscription: null};

        await service.handleInvoiceEvent(invoice);

        sinon.assert.notCalled(apiStub.getSubscription);
        sinon.assert.notCalled(memberRepositoryStub.get);
        sinon.assert.notCalled(eventRepositoryStub.registerPayment);

        expect(apiStub.getSubscription.called).to.be.false;
    });

    it('should throw NotFoundError if no member is found for subscription customer', async function () {
        const invoice = {
            customer: 'cust_123',
            plan: 'plan_123',
            subscription: 'sub_123'
        };
        apiStub.getSubscription.resolves(invoice);
        memberRepositoryStub.get.resolves(null);
        productRepositoryStub.get.resolves({
            stripe_product_id: 'product_123'
        });
        // expect throw

        let error;

        try {
            await service.handleInvoiceEvent(invoice);
        } catch (err) {
            error = err;
        }
    
        // Use Sinon to assert that the error is a NotFoundError with the expected message
        expect(error).to.be.instanceOf(errors.NotFoundError);
        expect(error.message).to.equal('No member found for customer cust_123');
    });

    it('should return early if subscription has more than one plan or no plans', async function () {
        const invoice = {
            subscription: 'sub_123',
            plan: null
        };
        apiStub.getSubscription.resolves(invoice);
        memberRepositoryStub.get.resolves(null);
        productRepositoryStub.get.resolves(null);

        await service.handleInvoiceEvent(invoice);

        sinon.assert.calledOnce(apiStub.getSubscription);
        sinon.assert.calledOnce(memberRepositoryStub.get);
        sinon.assert.notCalled(productRepositoryStub.get);
    });

    it('should return early if product is not found', async function () {
        const invoice = {
            subscription: 'sub_123',
            plan: 'plan_123'
        };
        apiStub.getSubscription.resolves(invoice);
        memberRepositoryStub.get.resolves(null);
        productRepositoryStub.get.resolves(null);

        await service.handleInvoiceEvent(invoice);

        sinon.assert.calledOnce(apiStub.getSubscription);
        sinon.assert.calledOnce(memberRepositoryStub.get);
        sinon.assert.calledOnce(productRepositoryStub.get);
    });

    it('can registerPayment', async function () {
        const invoice = {
            subscription: 'sub_123',
            plan: 'plan_123',
            amount_paid: 100,
            paid: true
        };
        apiStub.getSubscription.resolves(invoice);
        memberRepositoryStub.get.resolves({id: 'member_123'});
        productRepositoryStub.get.resolves({stripe_product_id: 'product_123'});

        await service.handleInvoiceEvent(invoice);

        sinon.assert.calledOnce(eventRepositoryStub.registerPayment);
    });

    it('should not registerPayment if invoice is not paid', async function () {
        const invoice = {
            subscription: 'sub_123',
            plan: 'plan_123',
            amount_paid: 0,
            paid: false
        };
        apiStub.getSubscription.resolves(invoice);
        memberRepositoryStub.get.resolves({id: 'member_123'});
        productRepositoryStub.get.resolves({stripe_product_id: 'product_123'});

        await service.handleInvoiceEvent(invoice);

        sinon.assert.notCalled(eventRepositoryStub.registerPayment);
    });

    it('should not registerPayment if invoice amount paid is 0', async function () {
        const invoice = {
            subscription: 'sub_123',
            plan: 'plan_123',
            amount_paid: 0,
            paid: true
        };
        apiStub.getSubscription.resolves(invoice);
        memberRepositoryStub.get.resolves({id: 'member_123'});
        productRepositoryStub.get.resolves({stripe_product_id: 'product_123'});

        await service.handleInvoiceEvent(invoice);

        sinon.assert.notCalled(eventRepositoryStub.registerPayment);
    });

    it('should not register payment if amount paid is 0 and invoice is not paid', async function () {
        const invoice = {
            subscription: 'sub_123',
            plan: 'plan_123',
            amount_paid: 0,
            paid: false
        };
        apiStub.getSubscription.resolves(invoice);
        memberRepositoryStub.get.resolves({id: 'member_123'});
        productRepositoryStub.get.resolves({stripe_product_id: 'product_123'});

        await service.handleInvoiceEvent(invoice);

        sinon.assert.notCalled(eventRepositoryStub.registerPayment);
    });

    it('should not registerPayment if member is not found', async function () {
        const invoice = {
            subscription: 'sub_123',
            plan: 'plan_123',
            amount_paid: 100,
            paid: true
        };
        apiStub.getSubscription.resolves(invoice);
        memberRepositoryStub.get.resolves(null);
        productRepositoryStub.get.resolves({stripe_product_id: 'product_123'});

        let error;

        try {
            await service.handleInvoiceEvent(invoice);
        } catch (err) {
            error = err;
        }

        expect(error).to.be.instanceOf(errors.NotFoundError);

        sinon.assert.notCalled(eventRepositoryStub.registerPayment);
    });
});
