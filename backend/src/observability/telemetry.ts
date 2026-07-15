import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { NodeSDK } from '@opentelemetry/sdk-node';

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();

export const telemetrySdk = endpoint
  ? new NodeSDK({
      serviceName:
        process.env.OTEL_SERVICE_NAME ?? process.env.RAILWAY_SERVICE_NAME ?? 'logo-platform-api',
      traceExporter: new OTLPTraceExporter({
        url: `${endpoint.replace(/\/+$/, '')}/v1/traces`,
        headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
          ? Object.fromEntries(
              process.env.OTEL_EXPORTER_OTLP_HEADERS.split(',').map((entry) => {
                const [key, ...rest] = entry.split('=');
                return [key!.trim(), rest.join('=').trim()];
              }),
            )
          : undefined,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false },
        }),
      ],
    })
  : null;

telemetrySdk?.start();
