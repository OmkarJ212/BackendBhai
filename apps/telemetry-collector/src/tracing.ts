import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter as OTLPHttpTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdkInstance: NodeSDK | null = null;

/**
 * Initializes the OpenTelemetry Node SDK for trace data collection.
 * 
 * @param defaultServiceName Service name (e.g. api-gateway, auth-service, order-service, payment-service)
 * @returns The initialized NodeSDK instance
 */
export function initTracing(defaultServiceName: string = 'unknown-service'): NodeSDK {
  if (sdkInstance) {
    console.warn('[Tracing] initTracing was called more than once. Returning existing SDK instance.');
    return sdkInstance;
  }

  const serviceName = process.env.SERVICE_NAME || defaultServiceName;
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318/v1/traces';

  let traceExporter: any;
  try {
    if (otlpEndpoint.includes(':4317')) {
      const { OTLPTraceExporter: OTLPGrpcTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
      traceExporter = new OTLPGrpcTraceExporter({ url: otlpEndpoint });
    } else {
      traceExporter = new OTLPHttpTraceExporter({ url: otlpEndpoint });
    }
  } catch {
    traceExporter = new OTLPHttpTraceExporter({ url: otlpEndpoint });
  }

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: '1.0.0',
    'deployment.environment': 'hackathon-demo',
  });

  sdkInstance = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-redis': { enabled: true },
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  try {
    sdkInstance.start();
    console.log(`[Tracing] OpenTelemetry SDK initialized for service "${serviceName}" sending to "${otlpEndpoint}".`);
  } catch (error) {
    console.error(`[Tracing] Error starting OpenTelemetry SDK for service "${serviceName}":`, error);
  }

  const handleShutdown = async (signal: string) => {
    console.log(`[Tracing] Received ${signal}. Shutting down OpenTelemetry SDK...`);
    if (sdkInstance) {
      try {
        await sdkInstance.shutdown();
        console.log('[Tracing] OpenTelemetry SDK shutdown successfully.');
      } catch (err) {
        console.error('[Tracing] Error shutting down OpenTelemetry SDK:', err);
      } finally {
        process.exit(0);
      }
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));

  return sdkInstance;
}
