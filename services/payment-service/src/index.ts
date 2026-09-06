import { initTracing, patchConsoleLogs, bodyCaptureMiddleware } from '@devtools/services-shared';

const SERVICE_NAME = 'payment-service';

initTracing(SERVICE_NAME);
patchConsoleLogs(SERVICE_NAME);

import express from 'express';

const app = express();
app.use(express.json());
app.use(bodyCaptureMiddleware);

// Placeholder route to verify instrumentation
app.get('/health', (req, res) => {
  console.log(`Health check hit for ${SERVICE_NAME}`);
  res.json({ status: 'ok', service: SERVICE_NAME });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} running on port ${PORT}`);
});
