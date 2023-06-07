const assert = require('assert');
const sinon = require('sinon');
const ObjectId = require('bson-objectid').default;

// To test
const DomainEventsAnalytics = require('../../../../../core/server/services/segment/DomainEventsAnalytics');

// Stubbed dependencies
const DomainEvents = require('@tryghost/domain-events');
const {MilestoneCreatedEvent} = require('@tryghost/milestones');

describe('DomainEventsAnalytics', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new DomainEventsAnalytics({});
        });
    });

    describe('Domain events analytics service', function () {
        let domainEventsAnalytics;
        let analyticsStub;
        let sentryStub;
        let loggingStub;
        let domainEventsStub;

        beforeEach(function () {
            analyticsStub = sinon.stub();
            sentryStub = sinon.stub();
            loggingStub = sinon.stub();
            domainEventsStub = sinon.stub();
        });

        afterEach(function () {
            sinon.restore();
        });

        it('subscribes to events', async function () {
            domainEventsAnalytics = new DomainEventsAnalytics({
                analytics: analyticsStub,
                trackDefaults: {
                    userId: '1234',
                    properties: {email: 'john@test.com'}
                },
                prefix: 'Pro: ',
                sentry: {
                    captureException: sentryStub
                },
                DomainEvents: {
                    subscribe: domainEventsStub
                },
                logging: {
                    error: loggingStub
                }
            });

            domainEventsAnalytics.subscribeToEvents();
            assert(domainEventsStub.callCount === 1);
            assert(loggingStub.callCount === 0);
        });

        it('handles milestone created event for 100 members', async function () {
            domainEventsAnalytics = new DomainEventsAnalytics({
                analytics: {
                    track: analyticsStub
                },
                trackDefaults: {
                    userId: '1234',
                    properties: {email: 'john@test.com'}
                },
                prefix: 'Pro: ',
                sentry: {
                    captureException: sentryStub
                },
                DomainEvents,
                logging: {
                    error: loggingStub
                }
            });

            domainEventsAnalytics.subscribeToEvents();

            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    id: new ObjectId().toHexString(),
                    type: 'members',
                    value: 100,
                    createdAt: new Date(),
                    emailSentAt: new Date()
                }
            }));

            await DomainEvents.allSettled();

            assert(analyticsStub.callCount === 1);
            assert(analyticsStub.calledWith({
                userId: '1234',
                properties: {email: 'john@test.com'},
                event: 'Pro: 100 members reached'
            }));

            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    id: new ObjectId().toHexString(),
                    type: 'members',
                    value: 1000,
                    createdAt: new Date(),
                    emailSentAt: new Date()
                }
            }));

            await DomainEvents.allSettled();
            // Analytics should not be called again
            assert(analyticsStub.callCount === 1);
            assert(loggingStub.callCount === 0);
        });

        it('handles milestone created event for $100 ARR', async function () {
            domainEventsAnalytics = new DomainEventsAnalytics({
                analytics: {
                    track: analyticsStub
                },
                trackDefaults: {
                    userId: '9876',
                    properties: {email: 'john+arr@test.com'}
                },
                prefix: 'Pro: ',
                sentry: {
                    captureException: sentryStub
                },
                DomainEvents,
                logging: {
                    error: loggingStub
                }
            });

            domainEventsAnalytics.subscribeToEvents();

            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    id: new ObjectId().toHexString(),
                    type: 'arr',
                    currency: 'usd',
                    value: 100,
                    createdAt: new Date(),
                    emailSentAt: new Date()
                }
            }));

            await DomainEvents.allSettled();

            assert(analyticsStub.callCount === 1);
            assert(analyticsStub.calledWith({
                userId: '9876',
                properties: {email: 'john+arr@test.com'},
                event: 'Pro: $100 MRR reached'
            }));
            assert(loggingStub.callCount === 0);

            DomainEvents.dispatch(MilestoneCreatedEvent.create({
                milestone: {
                    id: new ObjectId().toHexString(),
                    type: 'arr',
                    currency: 'usd',
                    value: 1000,
                    createdAt: new Date(),
                    emailSentAt: new Date()
                }
            }));

            await DomainEvents.allSettled();
            // Analytics should not be called again
            assert(analyticsStub.callCount === 1);
            assert(loggingStub.callCount === 0);
        });

        it('can handle tracking errors', async function () {
            let error = new Error('Test error');
            domainEventsAnalytics = new DomainEventsAnalytics({
                analytics: {
                    track: analyticsStub.throws(error)
                },
                trackDefaults: {},
                prefix: '',
                sentry: {
                    captureException: sentryStub
                },
                DomainEvents,
                logging: {
                    error: loggingStub
                }
            });

            domainEventsAnalytics.subscribeToEvents();

            try {
                DomainEvents.dispatch(MilestoneCreatedEvent.create({
                    milestone: {
                        id: new ObjectId().toHexString(),
                        type: 'arr',
                        currency: 'usd',
                        value: 100,
                        createdAt: new Date(),
                        emailSentAt: new Date()
                    }
                }));

                await DomainEvents.allSettled();
            } catch (err) {
                assert(analyticsStub.callCount === 1);
                assert(sentryStub.callCount === 1);
                assert(sentryStub.calledWith(error));
                assert(loggingStub.callCount === 1);
            }
        });
    });
});
