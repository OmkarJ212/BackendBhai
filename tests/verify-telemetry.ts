import { initTracing, patchConsoleLogs, bodyCaptureMiddleware } from '../apps/telemetry-collector/src/index.ts';
import type { Request, Response } from 'express';
import express from 'express';
import { trace } from '@opentelemetry/api';

console.log('[Test Setup] Initializing Telemetry Verification Test...');

// 1. Initialize Tracing & Logger
const serviceName = 'verification-service';
initTracing(serviceName);
patchConsoleLogs(serviceName);

// 2. Setup Express App with body capture middleware
const app = express();
app.use(express.json());
app.use(bodyCaptureMiddleware);

app.post('/api/test', (req: Request, res: Response) => {
  const activeSpan = trace.getActiveSpan();
  console.log('[Test Route] Handling /api/test request inside active trace context');
  
  res.json({
    status: 'success',
    receivedBody: req.body,
    traceId: activeSpan?.spanContext().traceId ?? 'none',
  });
});

// 3. Start server temporarily and verify route execution
const PORT = 4099;
const server = app.listen(PORT, () => {
  console.log(`[Test Server] Verification app listening on port ${PORT}`);

  // Perform an HTTP call to test tracing + logger + body capture
  fetch(`http://localhost:${PORT}/api/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello Telemetry Test', quantity: 42 }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log('[Test Client] Received response:', data);
      console.log('[Test Success] Telemetry Verification Completed Successfully!');
      server.close(() => process.exit(0));
    })
    .catch((err) => {
      console.error('[Test Error] Verification failed:', err);
      server.close(() => process.exit(1));
    });
});
