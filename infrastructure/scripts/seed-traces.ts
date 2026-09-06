import { Pool } from 'pg';
import crypto from 'crypto';

const connectionString = process.env.DATABASE_URL || 'postgresql://app:secret@localhost:5432/devtools';

const pool = new Pool({
  connectionString,
});

function randomHex(length: number): string {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

function isoTimeOffset(baseDate: Date, offsetMs: number): string {
  return new Date(baseDate.getTime() + offsetMs).toISOString();
}

async function seedTraces() {
  console.log('[Seed Traces] Starting direct database trace seeding...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let totalTracesCount = 0;
    const now = new Date();

    // 1. Happy Path Order (25 Traces)
    for (let i = 0; i < 25; i++) {
      const traceId = randomHex(32);
      const rootSpanId = randomHex(16);
      const authSpanId = randomHex(16);
      const orderSpanId = randomHex(16);
      const dbSpanId = randomHex(16);
      const paymentSpanId = randomHex(16);
      const mockPaySpanId = randomHex(16);

      const startTime = new Date(now.getTime() - (i * 120000) - Math.random() * 5000);
      const durationMs = 180 + Math.floor(Math.random() * 40);

      // Insert Trace
      await client.query(
        `INSERT INTO traces 
         (trace_id, root_span_name, method, path, status_code, duration_ms, request_body, response_body, service_count, has_errors, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (trace_id) DO NOTHING`,
        [
          traceId,
          'POST /api/orders',
          'POST',
          '/api/orders',
          200,
          durationMs,
          JSON.stringify({ userId: `usr_10${(i % 3) + 1}`, items: [{ productId: 'prd_001', quantity: 1 }] }),
          JSON.stringify({ orderId: `ord_${7000 + i}`, status: 'SUCCESS', total: 149.99 }),
          4,
          false,
          startTime.toISOString(),
        ]
      );

      // Insert Spans
      // Root Span (api-gateway)
      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [rootSpanId, traceId, null, 'POST /api/orders', 'SERVER', 'api-gateway', isoTimeOffset(startTime, 0), isoTimeOffset(startTime, durationMs), durationMs, 'OK', JSON.stringify({ 'http.status_code': 200 })]
      );

      // Auth Service Span
      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [authSpanId, traceId, rootSpanId, 'POST /auth/verify', 'CLIENT', 'auth-service', isoTimeOffset(startTime, 5), isoTimeOffset(startTime, 35), 30, 'OK', JSON.stringify({ 'http.status_code': 200 })]
      );

      // Order Service Span
      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [orderSpanId, traceId, rootSpanId, 'POST /orders', 'SERVER', 'order-service', isoTimeOffset(startTime, 40), isoTimeOffset(startTime, 175), 135, 'OK', JSON.stringify({ 'http.status_code': 200 })]
      );

      // DB Span
      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [dbSpanId, traceId, orderSpanId, 'INSERT INTO orders', 'INTERNAL', 'order-service', isoTimeOffset(startTime, 50), isoTimeOffset(startTime, 75), 25, 'OK', JSON.stringify({ 'db.system': 'postgresql', 'db.statement': 'INSERT INTO orders (id, user_id, total) VALUES ($1, $2, $3)' })]
      );

      // Payment Service Span
      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [paymentSpanId, traceId, orderSpanId, 'POST /payments', 'CLIENT', 'payment-service', isoTimeOffset(startTime, 80), isoTimeOffset(startTime, 170), 90, 'OK', JSON.stringify({ 'http.status_code': 200 })]
      );

      // Mock Payment API Span
      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [mockPaySpanId, traceId, paymentSpanId, 'POST /charges', 'CLIENT', 'mock-payment-api', isoTimeOffset(startTime, 90), isoTimeOffset(startTime, 160), 70, 'OK', JSON.stringify({ 'http.status_code': 200 })]
      );

      // Insert Log Events
      await client.query(
        `INSERT INTO log_events (trace_id, span_id, service_name, level, message, timestamp) VALUES
         ($1, $2, 'api-gateway', 'info', 'Received inbound order request', $3),
         ($1, $4, 'order-service', 'info', 'Successfully created order in DB', $5),
         ($1, $6, 'payment-service', 'info', 'Payment processed successfully via WireMock', $7)`,
        [traceId, rootSpanId, isoTimeOffset(startTime, 2), orderSpanId, isoTimeOffset(startTime, 76), paymentSpanId, isoTimeOffset(startTime, 165)]
      );

      totalTracesCount++;
    }

    // 2. Slow DB Query (10 Traces)
    for (let i = 0; i < 10; i++) {
      const traceId = randomHex(32);
      const rootSpanId = randomHex(16);
      const orderSpanId = randomHex(16);
      const dbSpanId = randomHex(16);

      const startTime = new Date(now.getTime() - (i * 300000) - 10000);
      const durationMs = 3200 + Math.floor(Math.random() * 300);

      await client.query(
        `INSERT INTO traces 
         (trace_id, root_span_name, method, path, status_code, duration_ms, request_body, response_body, service_count, has_errors, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (trace_id) DO NOTHING`,
        [traceId, 'GET /api/orders', 'GET', '/api/orders', 200, durationMs, null, JSON.stringify({ count: 1500, status: 'OK' }), 2, false, startTime.toISOString()]
      );

      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [rootSpanId, traceId, null, 'GET /api/orders', 'SERVER', 'api-gateway', isoTimeOffset(startTime, 0), isoTimeOffset(startTime, durationMs), durationMs, 'OK', JSON.stringify({ 'http.status_code': 200 })]
      );

      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [orderSpanId, traceId, rootSpanId, 'GET /orders', 'SERVER', 'order-service', isoTimeOffset(startTime, 10), isoTimeOffset(startTime, durationMs - 5), durationMs - 15, 'OK', JSON.stringify({ 'http.status_code': 200 })]
      );

      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [dbSpanId, traceId, orderSpanId, 'SELECT * FROM orders', 'INTERNAL', 'order-service', isoTimeOffset(startTime, 20), isoTimeOffset(startTime, durationMs - 20), durationMs - 40, 'OK', JSON.stringify({ 'db.system': 'postgresql', 'db.statement': 'SELECT * FROM orders WHERE status = \'COMPLETED\' ORDER BY created_at DESC pg_sleep(3.2)' })]
      );

      await client.query(
        `INSERT INTO log_events (trace_id, span_id, service_name, level, message, timestamp) VALUES
         ($1, $2, 'order-service', 'warn', 'Database query execution time exceeded 3000ms threshold!', $3)`,
        [traceId, dbSpanId, isoTimeOffset(startTime, durationMs - 15)]
      );

      totalTracesCount++;
    }

    // 3. Auth Timeout (10 Traces)
    for (let i = 0; i < 10; i++) {
      const traceId = randomHex(32);
      const rootSpanId = randomHex(16);
      const authSpanId = randomHex(16);

      const startTime = new Date(now.getTime() - (i * 250000) - 20000);
      const durationMs = 5000 + Math.floor(Math.random() * 200);

      await client.query(
        `INSERT INTO traces 
         (trace_id, root_span_name, method, path, status_code, duration_ms, request_body, response_body, service_count, has_errors, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (trace_id) DO NOTHING`,
        [traceId, 'POST /api/orders', 'POST', '/api/orders', 401, durationMs, JSON.stringify({ token: 'invalid_expired_token' }), JSON.stringify({ error: 'Unauthorized', message: 'Authentication token verification timed out after 5000ms' }), 2, true, startTime.toISOString()]
      );

      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [rootSpanId, traceId, null, 'POST /api/orders', 'SERVER', 'api-gateway', isoTimeOffset(startTime, 0), isoTimeOffset(startTime, durationMs), durationMs, 'ERROR', JSON.stringify({ 'http.status_code': 401 })]
      );

      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [authSpanId, traceId, rootSpanId, 'POST /auth/verify', 'CLIENT', 'auth-service', isoTimeOffset(startTime, 5), isoTimeOffset(startTime, durationMs - 5), durationMs - 10, 'ERROR', JSON.stringify({ 'http.status_code': 401, 'error.message': 'Token validation timed out' })]
      );

      await client.query(
        `INSERT INTO log_events (trace_id, span_id, service_name, level, message, timestamp) VALUES
         ($1, $2, 'auth-service', 'error', 'Authentication failed: Token validation timed out after 5000ms', $3)`,
        [traceId, authSpanId, isoTimeOffset(startTime, durationMs - 10)]
      );

      totalTracesCount++;
    }

    // 4. WireMock 503 Payment Failure (10 Traces)
    for (let i = 0; i < 10; i++) {
      const traceId = randomHex(32);
      const rootSpanId = randomHex(16);
      const orderSpanId = randomHex(16);
      const paymentSpanId = randomHex(16);
      const mockPaySpanId = randomHex(16);

      const startTime = new Date(now.getTime() - (i * 200000) - 30000);
      const durationMs = 450 + Math.floor(Math.random() * 100);

      await client.query(
        `INSERT INTO traces 
         (trace_id, root_span_name, method, path, status_code, duration_ms, request_body, response_body, service_count, has_errors, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (trace_id) DO NOTHING`,
        [traceId, 'POST /api/orders', 'POST', '/api/orders', 503, durationMs, JSON.stringify({ userId: 'usr_103', items: [{ productId: 'prd_002', quantity: 1 }] }), JSON.stringify({ error: 'Service Unavailable', message: 'Payment provider unavailable' }), 4, true, startTime.toISOString()]
      );

      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [rootSpanId, traceId, null, 'POST /api/orders', 'SERVER', 'api-gateway', isoTimeOffset(startTime, 0), isoTimeOffset(startTime, durationMs), durationMs, 'ERROR', JSON.stringify({ 'http.status_code': 503 })]
      );

      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [orderSpanId, traceId, rootSpanId, 'POST /orders', 'SERVER', 'order-service', isoTimeOffset(startTime, 20), isoTimeOffset(startTime, durationMs - 10), durationMs - 30, 'ERROR', JSON.stringify({ 'http.status_code': 503 })]
      );

      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [paymentSpanId, traceId, orderSpanId, 'POST /payments', 'CLIENT', 'payment-service', isoTimeOffset(startTime, 40), isoTimeOffset(startTime, durationMs - 20), durationMs - 60, 'ERROR', JSON.stringify({ 'http.status_code': 503 })]
      );

      await client.query(
        `INSERT INTO spans (span_id, trace_id, parent_span_id, name, kind, service_name, start_time, end_time, duration_ms, status_code, attributes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (span_id) DO NOTHING`,
        [mockPaySpanId, traceId, paymentSpanId, 'POST /charges', 'CLIENT', 'mock-payment-api', isoTimeOffset(startTime, 50), isoTimeOffset(startTime, durationMs - 30), durationMs - 80, 'ERROR', JSON.stringify({ 'http.status_code': 503, 'error.message': 'WireMock 503 Service Unavailable' })]
      );

      await client.query(
        `INSERT INTO log_events (trace_id, span_id, service_name, level, message, timestamp) VALUES
         ($1, $2, 'payment-service', 'error', 'External Payment Gateway WireMock returned 503 Service Unavailable', $3)`,
        [traceId, mockPaySpanId, isoTimeOffset(startTime, durationMs - 25)]
      );

      totalTracesCount++;
    }

    await client.query('COMMIT');
    console.log(`[Seed Traces Success] Successfully seeded ${totalTracesCount} diverse traces into PostgreSQL devtools database!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed Traces Error] Failed to seed trace data:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedTraces().catch(() => process.exit(1));
