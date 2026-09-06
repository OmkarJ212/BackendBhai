import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const seedScriptPath = path.join(__dirname, '../db/seed-traces.ts');

console.log('[Seed Script Verification] Auditing trace generator script...');

if (!fs.existsSync(seedScriptPath)) {
  throw new Error(`Seed script missing: ${seedScriptPath}`);
}

const content = fs.readFileSync(seedScriptPath, 'utf-8');

const requiredScenarios = [
  'Happy Path Order',
  'Slow DB Query',
  'Auth Timeout',
  'WireMock 503 Payment Failure'
];

for (const scenario of requiredScenarios) {
  if (!content.includes(scenario)) {
    throw new Error(`Missing scenario "${scenario}" in seed-traces.ts`);
  }
  console.log(`  ✓ Found scenario: "${scenario}"`);
}

if (!content.includes('totalTracesCount')) {
  throw new Error('Missing trace counting in seed-traces.ts');
}

console.log('[Seed Script Verification] db/seed-traces.ts verified successfully!');
process.exit(0);
