const opentelemetry = require('@opentelemetry/api');
/**
 * Instrumentation for Knex connection pool
 * 
 * This class listens for events from the Knex connection pool and creates spans for each event
 * 
 */
class OpenTelemetryKnexTracing {
    constructor({knex, config}) {
        this.enabled = config.get('opentelemetry:enabled');
        this.tracer = opentelemetry.trace.getTracer('ghost');
        this.knex = knex;
        this.outerSpans = {};
        this.acquireSpans = {};
        this.querySpans = {};
    }

    /**
     * 
     * @param {number} eventId - Knex connection pool event ID
     */
    handleAcquireRequest(eventId) {
        // A connection is being requested from the pool
        // This is the first event that fires when Knex is preparing to run a query
        // Create an outer span for the full execution, then an inner span for the connection acquire
        const outerSpan = this.tracer.startSpan('Knex');
        const ctx = opentelemetry.trace.setSpan(
            opentelemetry.context.active(),
            outerSpan
        );
        // Create the acquireSpan as a child of the outer span
        const acquireSpan = this.tracer.startSpan('Knex: Acquire connection', undefined, ctx);
        // Record some metrics around the connection pool on the span
        acquireSpan.setAttribute('eventID', eventId);
        acquireSpan.setAttribute('numPendingAcquires', this.knex.client.pool.numPendingAcquires());
        acquireSpan.setAttribute('numFree', this.knex.client.pool.numFree());
        acquireSpan.setAttribute('numUsed', this.knex.client.pool.numUsed());
        // Save the spans so we can close them later
        this.acquireSpans[eventId] = {outerSpan, acquireSpan};
    }

    /**
     * 
     * @param {number} eventId - Knex connection pool event ID
     * @param {*} resource - Knex connection resource
     */
    handleAcquireSuccess(eventId, resource) {
        // Connection has been acquired, close the acquire span
        const spans = this.acquireSpans[eventId];
        spans.acquireSpan.end();
        const connId = resource.__knexUid;
        this.outerSpans[connId] = spans.outerSpan;
        delete this.acquireSpans[eventId];
    }

    handleAcquireFail(eventId, err) {
        // Acquiring a connection failed, close the span with error status
        const spans = this.acquireSpans[eventId];
        spans.acquireSpan.setStatus({
            code: opentelemetry.SpanStatusCode.ERROR,
            message: err.message ?? 'Failed to acquire a connection from the pool'
        });
        spans.acquireSpan.end();
        delete this.acquireSpans[eventId];
    }

    handleRelease(resource) {
        // The query has finished, close the outer span
        const connId = resource.__knexUid;
        const outerSpan = this.outerSpans[connId];
        outerSpan.end();
        delete this.outerSpans[connId];
    }

    handleQuery(query) {
        // Get the outer span from the connection ID
        const connId = query.__knexUid;
        const queryId = query.__knexQueryUid;
        const outerSpan = this.outerSpans[connId];

        // Create a new child span for the query itself
        const ctx = opentelemetry.trace.setSpan(
            opentelemetry.context.active(),
            outerSpan
        );
        const querySpan = this.tracer.startSpan('Knex: Query', undefined, ctx);
        
        // Record some attributes on the query span
        // Build the query string with bindings
        // console.log(builtSql);
        querySpan.setAttribute('query', query.sql);
        querySpan.setAttribute('bindings', JSON.stringify(query.bindings));
        this.querySpans[queryId] = querySpan;
    }

    handleQueryResponse(response, query) {
        const queryId = query.__knexQueryUid;
        const span = this.querySpans[queryId];
        span.end();
        delete this.querySpans[queryId];
    }

    handleQueryError(error, query) {
        const queryId = query.__knexQueryUid;
        const span = this.querySpans[queryId];
        span.setStatus({
            code: opentelemetry.SpanStatusCode.ERROR,
            message: error.message ?? 'Query failed'
        });
        span.end();
        delete this.querySpans[queryId];
    }

    init() {
        if (this.enabled) {
            // Check to make sure these event listeners haven't already been added
            if (this.knex.client.pool.emitter.eventNames().length === 0) {
                // Fires when a connection is requested from the pool
                this.knex.client.pool.on('acquireRequest', eventId => this.handleAcquireRequest(eventId));
                // Fires when a connection is allocated from the pool
                this.knex.client.pool.on('acquireSuccess', (eventId, resource) => this.handleAcquireSuccess(eventId, resource));
                // Fires when a connection fails to be allocated from the pool
                this.knex.client.pool.on('acquireFail', (eventId, err) => this.handleAcquireFail(eventId, err));
                // Fires when a connection is released back into the pool
                this.knex.client.pool.on('release', resource => this.handleRelease(resource));

                // Add query handlers to Knex directly
                this.knex.on('query', query => this.handleQuery(query));
                this.knex.on('query-response', (response, object) => this.handleQueryResponse(response, object));
                this.knex.on('query-error', (err, query) => this.handleQueryError(err, query));
            }
        }
    }
}

module.exports = OpenTelemetryKnexTracing;
