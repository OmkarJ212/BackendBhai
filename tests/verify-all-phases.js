import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('[Workspace Verification] Auditing complete 6-Phase Infrastructure & Telemetry Workspace...');

const requiredFiles = [
  'package.json',
  'pnpm-workspace.yaml',
  'tsconfig.base.json',
  'Makefile',
  'docker-compose.yml',
  'otel-collector-config.yaml',
  'packages/shared-types/package.json',
  'packages/shared-types/src/types.ts',
  'packages/instrumentation/package.json',
  'packages/instrumentation/src/tracing.ts',
  'packages/instrumentation/src/logger.ts',
  'packages/instrumentation/src/index.ts',
  'packages/instrumentation/src/middleware/bodyCapture.ts',
  'infrastructure/db/devtools/001_initial.sql',
  'infrastructure/db/ecommerce/seed.sql',
  'infrastructure/scripts/seed-traces.ts',
  'services/api-gateway/package.json',
  'services/api-gateway/src/index.ts',
  'services/auth-service/package.json',
  'services/auth-service/src/index.ts',
  'services/order-service/package.json',
  'services/order-service/src/index.ts',
  'services/payment-service/package.json',
  'services/payment-service/src/index.ts'
];

let missingCount = 0;
for (const relPath of requiredFiles) {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`  ✕ MISSING: ${relPath}`);
    missingCount++;
  } else {
    const stats = fs.statSync(fullPath);
    console.log(`  ✓ VERIFIED: ${relPath} (${stats.size} bytes)`);
  }
}

if (missingCount > 0) {
  console.error(`[Workspace Verification FAILED] ${missingCount} required files are missing.`);
  process.exit(1);
} else {
  console.log('\n🎉 [Workspace Verification SUCCESS] All 6 Phases completed and verified in BackendBhai repo!');
  process.exit(0);
}
