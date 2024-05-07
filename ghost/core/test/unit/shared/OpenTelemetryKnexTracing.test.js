const assert = require('assert/strict');
const sinon = require('sinon');
const configUtils = require('../../utils/configUtils');
const OpenTelemetryKnexTracing = require('../../../core/shared/OpenTelemetryKnexTracing');

describe('UNIT: OpenTelemetryKnexTracing', function () {
    afterEach(async function () {
        await configUtils.restore();
        sinon.restore();
    });

    describe('init', function () {
        it('subscribes to the correct events on the knex object', function () {
            const knex = {
                on: sinon.stub(),
                client: {
                    pool: {
                        on: sinon.stub(),
                        emitter: {
                            eventNames: sinon.stub().returns([])
                        }
                    }
                }
            };
            const tracing = new OpenTelemetryKnexTracing({knex});
            tracing.init();
            assert.ok(knex.client.pool.on.calledWith('acquireRequest'));
            assert.ok(knex.client.pool.on.calledWith('acquireSuccess'));
            assert.ok(knex.client.pool.on.calledWith('acquireFail'));
            assert.ok(knex.client.pool.on.calledWith('release'));

            assert.ok(knex.on.calledWith('query', sinon.match.func));
            assert.ok(knex.on.calledWith('query-response', sinon.match.func));
            assert.ok(knex.on.calledWith('query-error', sinon.match.func));
        });
    });

    describe('handleAcquireRequest', function () {
        it('creates an outer span for the full execution and an inner span for the connection acquire', function () {
            const knex = {
                client: {
                    pool: {
                        numPendingAcquires: sinon.stub().returns(1),
                        numFree: sinon.stub().returns(2),
                        numUsed: sinon.stub().returns(3)
                    }
                }
            };
            const tracing = new OpenTelemetryKnexTracing({knex});
            sinon.stub(tracing.tracer, 'startSpan').returns({setAttribute: sinon.stub()});
            tracing.handleAcquireRequest(1);
            assert.ok(tracing.tracer.startSpan.calledWith('Knex'));
            assert.ok(tracing.tracer.startSpan.calledWith('Knex: Acquire connection'));
        });
    });

    describe('handleAcquireSuccess', function () {
        it('closes the acquire span', function () {
            const knex = {
                client: {
                    pool: {
                        numPendingAcquires: sinon.stub().returns(1),
                        numFree: sinon.stub().returns(2),
                        numUsed: sinon.stub().returns(3)
                    }
                }
            };
            const spanStub = {
                end: sinon.stub(),
                setAttribute: sinon.stub()
            };
            const tracing = new OpenTelemetryKnexTracing({knex});
            sinon.stub(tracing.tracer, 'startSpan').returns(spanStub);
            tracing.handleAcquireRequest(1);
            tracing.handleAcquireSuccess(1, {});
            assert.ok(tracing.tracer.startSpan.calledWith('Knex: Acquire connection'));
            assert.ok(spanStub.end.calledOnce);
        });
    });

    describe('handleAcquireFail', function () {
        it('closes the span with error status', function () {
            const knex = {
                client: {
                    pool: {
                        numPendingAcquires: sinon.stub().returns(1),
                        numFree: sinon.stub().returns(2),
                        numUsed: sinon.stub().returns(3)
                    }
                }
            };
            const spanStub = {
                end: sinon.stub(),
                setStatus: sinon.stub(),
                setAttribute: sinon.stub()
            };
            const tracing = new OpenTelemetryKnexTracing({knex});
            sinon.stub(tracing.tracer, 'startSpan').returns(spanStub);
            tracing.handleAcquireRequest(1);
            tracing.handleAcquireFail(1, {});
            assert.ok(tracing.tracer.startSpan.calledWith('Knex: Acquire connection'));
            assert.ok(spanStub.setStatus.calledOnce);
        });
    });

    describe('handleRelease', function () {
        it('closes the outer span', function () {
            const knex = {
                client: {
                    pool: {
                        numPendingAcquires: sinon.stub().returns(1),
                        numFree: sinon.stub().returns(2),
                        numUsed: sinon.stub().returns(3)
                    }
                }
            };
            const spanStub = {
                end: sinon.stub(),
                setAttribute: sinon.stub()
            };
            const tracing = new OpenTelemetryKnexTracing({knex});
            sinon.stub(tracing.tracer, 'startSpan').returns(spanStub);
            tracing.handleAcquireRequest(1);
            tracing.handleAcquireSuccess(1, {});
            tracing.handleRelease({});
            // We close the acquire span and the outer span
            assert.ok(spanStub.end.calledTwice);
        });
    });

    describe('handleQuery', function () {
        it('creates a span for executing the query', function () {
            const knex = {
                client: {
                    pool: {
                        numPendingAcquires: sinon.stub().returns(1),
                        numFree: sinon.stub().returns(2),
                        numUsed: sinon.stub().returns(3)
                    }
                }
            };
            const spanStub = {
                end: sinon.stub(),
                setAttribute: sinon.stub()
            };
            const tracing = new OpenTelemetryKnexTracing({knex});
            sinon.stub(tracing.tracer, 'startSpan').returns(spanStub);
            tracing.handleAcquireRequest(1);
            tracing.handleAcquireSuccess(1, {});
            tracing.handleQuery({
                __knexUid: 1,
                __knexQueryUid: 2,
                sql: 'SELECT * FROM table',
                bindings: [1]
            });
            assert.ok(tracing.tracer.startSpan.calledWith('Knex: Query'));
            assert.ok(spanStub.setAttribute.withArgs('query', 'SELECT * FROM table').calledOnce);
            assert.ok(spanStub.setAttribute.withArgs('bindings', '[1]').calledOnce);
        });
    });

    describe('handleQueryResponse', function () {
        it('closes the query span', function () {
            const knex = {
                client: {
                    pool: {
                        numPendingAcquires: sinon.stub().returns(1),
                        numFree: sinon.stub().returns(2),
                        numUsed: sinon.stub().returns(3)
                    }
                }
            };
            const spanStub = {
                end: sinon.stub(),
                setAttribute: sinon.stub()
            };
            const tracing = new OpenTelemetryKnexTracing({knex});
            sinon.stub(tracing.tracer, 'startSpan').returns(spanStub);
            tracing.handleAcquireRequest(1);
            tracing.handleAcquireSuccess(1, {});
            tracing.handleQuery({
                __knexUid: 1,
                __knexQueryUid: 2,
                sql: 'SELECT * FROM table',
                bindings: [1]
            });
            tracing.handleQueryResponse({}, {
                __knexQueryUid: 2
            });
            assert.ok(spanStub.end.calledTwice);
        });
    });

    describe('handleQueryError', function () {
        it('closes the query span with error status', function () {
            const knex = {
                client: {
                    pool: {
                        numPendingAcquires: sinon.stub().returns(1),
                        numFree: sinon.stub().returns(2),
                        numUsed: sinon.stub().returns(3)
                    }
                }
            };
            const spanStub = {
                end: sinon.stub(),
                setAttribute: sinon.stub(),
                setStatus: sinon.stub()
            };
            const tracing = new OpenTelemetryKnexTracing({knex});
            sinon.stub(tracing.tracer, 'startSpan').returns(spanStub);
            tracing.handleAcquireRequest(1);
            tracing.handleAcquireSuccess(1, {});
            tracing.handleQuery({
                __knexUid: 1,
                __knexQueryUid: 2,
                sql: 'SELECT * FROM table',
                bindings: [1]
            });
            tracing.handleQueryError({}, {
                __knexQueryUid: 2
            });
            assert.ok(spanStub.end.calledTwice);
            assert.ok(spanStub.setStatus.calledOnce);
        });
    });
});
