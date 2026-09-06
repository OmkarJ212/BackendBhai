# Telemetry Collector Service (`apps/telemetry-collector`)

This package contains the OpenTelemetry Collector Contrib configuration and telemetry ingestion pipeline for **BackendBhai**.

## Features

- **Receivers**: OTLP gRPC (`:4317`) and OTLP HTTP (`:4318`)
- **Processors**:
  - `attributes` & `transform`: Redacts `authorization`, `cookie`, `x-api-key`, and `x-auth-token` headers to `**REDACTED**`
  - `batch`: Groups trace spans and logs before forwarding
- **Exporters**: `otlphttp` exporting to `http://devtools-server:4001/api/v1/otlp` and `logging` (detailed verbosity for development)

## Configuration File

The primary collector configuration is located at [`otel-collector-config.yaml`](./otel-collector-config.yaml).
