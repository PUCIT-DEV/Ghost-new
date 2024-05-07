const {NodeSDK} = require('@opentelemetry/sdk-node');
const {OTLPTraceExporter} = require('@opentelemetry/exporter-trace-otlp-http');
const {ExpressInstrumentation} = require('@opentelemetry/instrumentation-express');
const {HttpInstrumentation} = require('@opentelemetry/instrumentation-http');
const {NestInstrumentation} = require('@opentelemetry/instrumentation-nestjs-core');
const {RedisInstrumentation} = require('@opentelemetry/instrumentation-redis');

async function initOpenTelemetry({config}) {
    // Do nothing if Open Telemetry is disabled
    if (!config.get('opentelemetry:enabled')) {
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

function initKnexQueryInstrumentation({knex, config}) {
    const Instrumentation = require('./OpenTelemetryKnexTracing');
    const instrumentation = new Instrumentation({knex, config});
    instrumentation.init();
}

module.exports = {
    initOpenTelemetry,
    initKnexQueryInstrumentation
};