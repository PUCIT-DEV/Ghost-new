const {NodeSDK} = require('@opentelemetry/sdk-node');
const {OTLPTraceExporter} = require('@opentelemetry/exporter-trace-otlp-http');
const {ExpressInstrumentation} = require('@opentelemetry/instrumentation-express');
const {HttpInstrumentation} = require('@opentelemetry/instrumentation-http');
const {NestInstrumentation} = require('@opentelemetry/instrumentation-nestjs-core');
const {RedisInstrumentation} = require('@opentelemetry/instrumentation-redis');

async function initOpenTelemetry({config}) {
    // Always enable in development environment
    // In production, only enable if explicitly enabled via config `opentelemetry:enabled`
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isConfigured = config.get('opentelemetry:enabled');
    const enabled = isDevelopment || isConfigured;
    if (!enabled) {
        return;
    }
    const collectorOptions = {
        url: config.get('opentelemetry:exporter:endpoint') || 'http://localhost:4318/v1/traces',
        headers: {},
        concurrencyLimit: 10
    };
    const sdk = new NodeSDK({
        serviceName: 'ghost',
        traceExporter: new OTLPTraceExporter(collectorOptions),
        instrumentations: [
            new ExpressInstrumentation(),
            new HttpInstrumentation(),
            new NestInstrumentation(),
            new RedisInstrumentation()
        ]
    });
    sdk.start();
}

function initKnexQueryInstrumentation({knex}) {
    const KnexTracing = require('./OpenTelemetryKnexTracing');
    const knexTracing = new KnexTracing({knex});
}

module.exports = {
    initOpenTelemetry,
    initKnexQueryInstrumentation
};