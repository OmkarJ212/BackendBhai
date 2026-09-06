import { trace } from '@opentelemetry/api';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

let patched = false;

const originalConsoleLog = console.log.bind(console);
const originalConsoleWarn = console.warn.bind(console);
const originalConsoleError = console.error.bind(console);
const originalConsoleDebug = console.debug.bind(console);

interface LogEntry {
  timestamp: string;
  service: string;
  level: LogLevel;
  message: string;
  trace_id: string | null;
  span_id: string | null;
  error?: { name: string; message: string; stack?: string };
  [key: string]: unknown;
}

/**
 * Creates a trace-context aware logger function object matching dev1.md §6.4.
 */
export function createLogger(serviceName: string = process.env.SERVICE_NAME || 'unknown-service') {
  return {
    info(message: string, meta?: Record<string, unknown>) {
      const spanContext = trace.getActiveSpan()?.spanContext();
      const logPayload = {
        level: 'info',
        message,
        service: serviceName,
        service_name: serviceName,
        trace_id: spanContext?.traceId ?? null,
        span_id: spanContext?.spanId ?? null,
        timestamp: new Date().toISOString(),
        ...meta,
      };
      originalConsoleLog(JSON.stringify(logPayload));
    },
    error(message: string, error?: Error, meta?: Record<string, unknown>) {
      const spanContext = trace.getActiveSpan()?.spanContext();
      const logPayload = {
        level: 'error',
        message,
        service: serviceName,
        service_name: serviceName,
        trace_id: spanContext?.traceId ?? null,
        span_id: spanContext?.spanId ?? null,
        timestamp: new Date().toISOString(),
        error: error ? { name: error.name, message: error.message, stack: error.stack } : undefined,
        ...meta,
      };
      originalConsoleError(JSON.stringify(logPayload));
    },
    warn(message: string, meta?: Record<string, unknown>) {
      const spanContext = trace.getActiveSpan()?.spanContext();
      const logPayload = {
        level: 'warn',
        message,
        service: serviceName,
        service_name: serviceName,
        trace_id: spanContext?.traceId ?? null,
        span_id: spanContext?.spanId ?? null,
        timestamp: new Date().toISOString(),
        ...meta,
      };
      originalConsoleWarn(JSON.stringify(logPayload));
    },
    debug(message: string, meta?: Record<string, unknown>) {
      const spanContext = trace.getActiveSpan()?.spanContext();
      const logPayload = {
        level: 'debug',
        message,
        service: serviceName,
        service_name: serviceName,
        trace_id: spanContext?.traceId ?? null,
        span_id: spanContext?.spanId ?? null,
        timestamp: new Date().toISOString(),
        ...meta,
      };
      originalConsoleDebug(JSON.stringify(logPayload));
    }
  };
}

/**
 * Monkey-patches native console logging methods (log, info, warn, error)
 * to output structured JSON logs injected with active OpenTelemetry trace_id and span_id.
 */
export function patchConsoleLogs(serviceName: string = process.env.SERVICE_NAME || 'unknown-service'): void {
  if (patched) {
    return;
  }

  const logger = createLogger(serviceName);

  console.log = (...args: unknown[]) => {
    const msg = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
    logger.info(msg);
  };

  console.info = (...args: unknown[]) => {
    const msg = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
    logger.info(msg);
  };

  console.warn = (...args: unknown[]) => {
    const msg = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
    logger.warn(msg);
  };

  console.error = (...args: unknown[]) => {
    const errArg = args.find((a) => a instanceof Error) as Error | undefined;
    const msg = args.map((arg) => (arg instanceof Error ? arg.message : typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
    logger.error(msg, errArg);
  };

  console.debug = (...args: unknown[]) => {
    const msg = args.map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg))).join(' ');
    logger.debug(msg);
  };

  patched = true;
  originalConsoleLog(JSON.stringify({
    timestamp: new Date().toISOString(),
    service: serviceName,
    service_name: serviceName,
    level: 'info',
    message: `[Logger] Console monkey-patching initialized for service "${serviceName}"`,
    trace_id: null,
    span_id: null,
  }));
}
