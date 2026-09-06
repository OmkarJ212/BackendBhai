export type SpanKind = 'server' | 'client' | 'producer' | 'consumer' | 'internal' | 'SERVER' | 'CLIENT' | 'PRODUCER' | 'CONSUMER' | 'INTERNAL';
export type SpanStatus = 'ok' | 'error' | 'unset' | 'OK' | 'ERROR' | 'UNSET';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface SpanEvent {
  id?: number;
  span_id?: string;
  name: string;
  event_name?: string;
  timestamp: string | number;
  attributes?: Record<string, unknown>;
}

export interface Span {
  id: string;
  span_id: string;
  trace_id: string;
  parent_span_id?: string | null;
  name: string;
  operation_name: string;
  kind: SpanKind;
  span_type: SpanKind;
  service_name: string;
  service?: string;
  start_time: string | number;
  end_time: string | number;
  duration_ms: number;
  status: SpanStatus;
  status_code: number | string;
  status_message?: string | null;
  attributes?: Record<string, unknown>;
  events?: SpanEvent[];
  depth?: number;
  order?: number;
}

export interface Trace {
  id: string;
  trace_id: string;
  name: string;
  root_span_name: string;
  root_service: string;
  method: string;
  path: string;
  status: SpanStatus;
  status_code: number;
  duration_ms: number;
  start_time?: string | number;
  end_time?: string | number;
  request_headers?: Record<string, string>;
  request_body?: Record<string, unknown> | string | null;
  response_headers?: Record<string, string>;
  response_body?: Record<string, unknown> | string | null;
  response_size?: number | null;
  service_count: number;
  services: string[];
  has_errors: boolean;
  timestamp: string;
  created_at?: string;
  spans?: Span[];
  metadata?: Record<string, unknown>;
}

export interface LogEvent {
  id?: number;
  trace_id: string | null;
  span_id?: string | null;
  service: string;
  service_name: string;
  level: LogLevel;
  message: string;
  timestamp: string | number;
  attributes?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}

export interface RequestSummary {
  id?: string;
  trace_id: string;
  method: string;
  path: string;
  status: SpanStatus;
  status_code: number;
  duration_ms: number;
  root_service: string;
  service_count: number;
  services: string[];
  span_count: number;
  log_count: number;
  error_count: number;
  has_errors: boolean;
  timestamp: string;
  start_time?: number | string;
  created_at?: string;
}

export interface WaterfallSpan extends Span {
  depth: number;
  relative_start_ms: number;
  start_offset_ms: number;
  percentage_of_trace: number;
  percentage_of_total: number;
  children?: WaterfallSpan[];
}

export interface RequestSnapshot {
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: string | null;
  trace_id: string;
  service: string;
  timestamp: number;
  duration_ms: number;
  status_code: number;
}

export interface ReplaySession {
  id: string;
  replay_id: string;
  original_trace_id: string;
  replayed_trace_id?: string | null;
  replay_trace_id?: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  request_snapshot?: RequestSnapshot;
  overrides?: Record<string, unknown>;
  original_duration_ms?: number | null;
  replay_duration_ms?: number | null;
  error_message?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface ComparisonResult {
  trace_a?: { trace_id: string; total_duration_ms: number; status: string; status_code: number; services: string[] };
  trace_b?: { trace_id: string; total_duration_ms: number; status: string; status_code: number; services: string[] };
  base_trace_id: string;
  comparison_trace_id: string;
  duration_diff_ms: number;
  duration_change_percentage: number;
  duration_diff_percentage?: number;
  status_changed: boolean;
  status_match?: boolean;
  status_code_match?: boolean;
  span_count_diff: number;
  missing_spans: string[];
  added_spans: string[];
  service_diff?: { added: string[]; removed: string[]; unchanged: string[] };
  span_diff?: {
    total_spans_a: number; total_spans_b: number; matched: number; unmatched_a: number; unmatched_b: number;
    details: Array<{ operation_name: string; service_name: string; duration_a_ms: number; duration_b_ms: number; diff_ms: number; status_a: string; status_b: string; status_match: boolean }>;
  };
  duration_diffs: Array<{
    span_name: string;
    base_duration_ms: number;
    comparison_duration_ms: number;
    diff_ms: number;
  }>;
}

export interface Service {
  name: string;
  version: string;
  environment: string;
  request_count: number;
  error_count: number;
  avg_duration_ms: number;
  last_seen: string | null;
  first_seen: string;
}

export interface ServiceDependency {
  source_service: string;
  target_service: string;
  dependency_type: 'http' | 'database' | 'cache' | 'external';
  request_count: number;
  error_count: number;
  avg_duration_ms: number;
  protocol: 'http' | 'grpc' | 'sql' | 'redis' | null;
}

export interface TopologyNode {
  id: string;
  label: string;
  type: 'service' | 'database' | 'cache' | 'external';
  request_count?: number;
  error_count?: number;
  avg_duration_ms?: number;
}

export interface TopologyEdge {
  id?: string;
  source: string;
  target: string;
  type?: 'http' | 'database' | 'cache' | 'external';
  call_count: number;
  request_count?: number;
  error_count: number;
  avg_duration_ms?: number;
  protocol?: 'http' | 'sql' | 'redis' | null;
}

export interface TopologyResult {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
}

export type WSEvent =
  | { type: 'new_request'; data: RequestSummary }
  | { type: 'trace_update'; data: { trace_id: string; spans: Span[]; logs: LogEvent[] } }
  | { type: 'replay_progress'; data: { replay_id: string; step: string; status: ReplaySession['status'] } }
  | { type: 'replay_complete'; data: { replay_id: string; original_trace_id: string; replay_trace_id: string | null; status: ReplaySession['status']; duration_ms: number } }
  | { type: 'service_update'; data: { service_name: string; request_count: number; error_count: number; avg_duration_ms: number } }
  | { type: 'error'; data: { message: string; code: string } };
