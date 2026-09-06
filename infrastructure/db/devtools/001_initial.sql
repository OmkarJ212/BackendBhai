-- BackendBhai Telemetry Database Schema (devtools DB)

CREATE TABLE IF NOT EXISTS traces (
    trace_id VARCHAR(64) PRIMARY KEY,
    root_span_name VARCHAR(255) NOT NULL,
    method VARCHAR(16) NOT NULL,
    path VARCHAR(1024) NOT NULL,
    status_code INT NOT NULL,
    duration_ms FLOAT NOT NULL,
    request_body JSONB,
    response_body JSONB,
    service_count INT NOT NULL DEFAULT 1,
    has_errors BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_traces_status_code ON traces(status_code);
CREATE INDEX IF NOT EXISTS idx_traces_has_errors ON traces(has_errors);
CREATE INDEX IF NOT EXISTS idx_traces_method_path ON traces(method, path);

CREATE TABLE IF NOT EXISTS spans (
    span_id VARCHAR(64) PRIMARY KEY,
    trace_id VARCHAR(64) NOT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,
    parent_span_id VARCHAR(64),
    name VARCHAR(255) NOT NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'INTERNAL',
    service_name VARCHAR(128) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_ms FLOAT NOT NULL,
    status_code VARCHAR(32) NOT NULL DEFAULT 'OK',
    attributes JSONB
);

CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_spans_service_name ON spans(service_name);
CREATE INDEX IF NOT EXISTS idx_spans_parent_span_id ON spans(parent_span_id);

CREATE TABLE IF NOT EXISTS log_events (
    id SERIAL PRIMARY KEY,
    trace_id VARCHAR(64) REFERENCES traces(trace_id) ON DELETE CASCADE,
    span_id VARCHAR(64),
    service_name VARCHAR(128) NOT NULL,
    level VARCHAR(16) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_log_events_trace_id ON log_events(trace_id);
CREATE INDEX IF NOT EXISTS idx_log_events_level ON log_events(level);

CREATE TABLE IF NOT EXISTS service_dependencies (
    caller_service VARCHAR(128) NOT NULL,
    callee_service VARCHAR(128) NOT NULL,
    call_count INT NOT NULL DEFAULT 0,
    error_count INT NOT NULL DEFAULT 0,
    PRIMARY KEY (caller_service, callee_service)
);

CREATE TABLE IF NOT EXISTS replay_sessions (
    replay_id VARCHAR(64) PRIMARY KEY,
    original_trace_id VARCHAR(64) NOT NULL REFERENCES traces(trace_id) ON DELETE CASCADE,
    replayed_trace_id VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_replay_sessions_original ON replay_sessions(original_trace_id);
