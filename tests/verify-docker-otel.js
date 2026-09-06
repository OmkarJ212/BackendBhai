import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dockerComposePath = path.join(__dirname, '../docker-compose.yml');
const otelConfigPath = path.join(__dirname, '../otel-collector-config.yaml');

console.log('[Docker & OTel Verification] Validating configuration files...');

function verifyFileContains(filePath, substrings) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File missing: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(`[Docker & OTel Verification] Inspecting ${path.basename(filePath)} (${content.length} bytes)...`);

  for (const sub of substrings) {
    if (!content.includes(sub)) {
      throw new Error(`Missing expected string "${sub}" in ${path.basename(filePath)}`);
    }
    console.log(`  ✓ Found configuration entry: "${sub}"`);
  }
}

try {
  verifyFileContains(dockerComposePath, [
    'postgres:16-alpine',
    'redis:7-alpine',
    'otel/opentelemetry-collector-contrib:latest',
    'wiremock/wiremock:3.3.1',
    '5432:5432',
    '6379:6379',
    '4317:4317',
    '4318:4318',
    '4000:4000'
  ]);

  verifyFileContains(otelConfigPath, [
    'endpoint: 0.0.0.0:4317',
    'endpoint: 0.0.0.0:4318',
    'attributes/redact',
    '**REDACTED**',
    'otlphttp/devtools',
    'http://devtools-server:4001/api/v1/otlp/v1/traces',
    'receivers: [otlp]',
    'exporters: [otlphttp/devtools, debug]'
  ]);

  console.log('[Docker & OTel Verification] docker-compose.yml and otel-collector-config.yaml verified successfully!');
  process.exit(0);
} catch (err) {
  console.error('[Docker & OTel Verification Failed]', err);
  process.exit(1);
}
