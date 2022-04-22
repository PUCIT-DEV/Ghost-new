const sinon = require('sinon');
const assert = require('assert');

// Unmocked things the newsletter service needs
const SingleUseTokenProvider = require('../../../../../core/server/services/members/SingleUseTokenProvider');
const models = require('../../../../../core/server/models');
const mail = require('../../../../../core/server/services/mail');

// Mocked utilities
const urlUtils = require('../../../../utils/urlUtils');
const {mockManager} = require('../../../../utils/e2e-framework');

const NewslettersService = require('../../../../../core/server/services/newsletters/service');

describe('NewslettersService', function () {
    let newsletterService, getStub;

    before(function () {
        models.init();

        newsletterService = new NewslettersService({
            NewsletterModel: models.Newsletter,
            mail,
            SingleUseTokenModel: models.SingleUseToken,
            SingleUseTokenProvider: SingleUseTokenProvider,
            urlUtils: urlUtils.stubUrlUtilsFromConfig()
        });
    });

    beforeEach(function () {
        getStub = sinon.stub();
        mockManager.mockMail();
    });

    afterEach(function () {
        mockManager.restore();
    });

    // @TODO replace this with a specific function for fetching all available newsletters
    describe('browse', function () {
        it('lists all newsletters by calling findAll and toJSON', async function () {
            const toJSONStub = sinon.stub();
            const findAllStub = sinon.stub(models.Newsletter, 'findAll').returns({toJSON: toJSONStub});

            await newsletterService.browse({});

            sinon.assert.calledOnce(findAllStub);
            sinon.assert.calledOnce(toJSONStub);
        });
    });

    describe('add', function () {
        let addStub;
        beforeEach(function () {
            // Stub add as a function that returns a get
            addStub = sinon.stub(models.Newsletter, 'add').returns({get: getStub});
        });

        it('rejects if called with no data', async function () {
            assert.rejects(await newsletterService.add, {name: 'TypeError'});
            sinon.assert.notCalled(addStub);
        });

        it('will attempt to add empty object without verification', async function () {
            const result = await newsletterService.add({});

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnceWithExactly(addStub, {}, undefined);
        });

        it('will pass object and options through to model when there are no fields needing verification', async function () {
            const data = {name: 'hello world'};
            const options = {foo: 'bar'};

            const result = await newsletterService.add(data, options);

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnceWithExactly(addStub, data, options);
        });

        it('will trigger verification when sender_email is provided', async function () {
            const data = {name: 'hello world', sender_email: 'test@example.com'};
            const options = {foo: 'bar'};

            const result = await newsletterService.add(data, options);

            assert.deepEqual(result.meta, {
                sent_email_verification: [
                    'sender_email'
                ]
            });
            sinon.assert.calledOnceWithExactly(addStub, {name: 'hello world'}, options);
            mockManager.assert.sentEmail({to: 'test@example.com'});
        });
    });

    describe('edit', function () {
        let editStub, findOneStub;
        beforeEach(function () {
            // Stub edit as a function that returns its first argument
            editStub = sinon.stub(models.Newsletter, 'edit').returns({get: getStub});
            findOneStub = sinon.stub(models.Newsletter, 'findOne').returns({get: getStub});
        });

        it('rejects if called with no data', async function () {
            assert.rejects(await newsletterService.add, {name: 'TypeError'});
            sinon.assert.notCalled(editStub);
        });

        it('will attempt to add empty object without verification', async function () {
            const result = await newsletterService.edit({});

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnceWithExactly(editStub, {}, undefined);
        });

        it('will pass object and options through to model when there are no fields needing verification', async function () {
            const data = {name: 'hello world'};
            const options = {foo: 'bar'};

            const result = await newsletterService.edit(data, options);

            assert.equal(result.meta, undefined); // meta property has not been added
            sinon.assert.calledOnceWithExactly(editStub, data, options);
            sinon.assert.calledOnceWithExactly(findOneStub, options, {require: true});
        });

        it('will trigger verification when sender_email is provided', async function () {
            const data = {name: 'hello world', sender_email: 'test@example.com'};
            const options = {foo: 'bar'};

            const result = await newsletterService.edit(data, options);

            assert.deepEqual(result.meta, {
                sent_email_verification: [
                    'sender_email'
                ]
            });
            sinon.assert.calledOnceWithExactly(editStub, {name: 'hello world'}, options);
            sinon.assert.calledOnceWithExactly(findOneStub, options, {require: true});
            mockManager.assert.sentEmail({to: 'test@example.com'});
        });

        it('will NOT trigger verification when sender_email is provided but is already verified', async function () {
            const data = {name: 'hello world', sender_email: 'test@example.com'};
            const options = {foo: 'bar'};

            // The model says this is already verified
            getStub.withArgs('sender_email').returns('test@example.com');

            const result = await newsletterService.edit(data, options);

            assert.deepEqual(result.meta, undefined);
            sinon.assert.calledOnceWithExactly(editStub, {name: 'hello world', sender_email: 'test@example.com'}, options);
            sinon.assert.calledOnceWithExactly(findOneStub, options, {require: true});
            mockManager.assert.sentEmailCount(0);
        });
    });

    describe('verifyPropertyUpdate', function () {
        let editStub;

        beforeEach(function () {
            editStub = sinon.stub(models.Newsletter, 'edit').returns({get: getStub});
            sinon.assert.notCalled(editStub);
        });

        it('rejects if called with no data', async function () {
            assert.rejects(await newsletterService.verifyPropertyUpdate, {name: 'TypeError'});
        });
    });
});
