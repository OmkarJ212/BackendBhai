import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const devtoolsSqlPath = path.join(__dirname, '../infrastructure/db/devtools/001_initial.sql');
const ecommerceSqlPath = path.join(__dirname, '../infrastructure/db/ecommerce/seed.sql');

console.log('[SQL Verification] Checking database schema files...');

function verifySqlFile(filePath, expectedTables) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file missing: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  console.log(`[SQL Verification] Inspecting ${path.basename(filePath)} (${content.length} bytes)...`);

  for (const table of expectedTables) {
    const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i');
    if (!tableRegex.test(content)) {
      throw new Error(`Missing expected table definition "${table}" in ${path.basename(filePath)}`);
    }
    console.log(`  ✓ Found table definition: ${table}`);
  }
}

try {
  verifySqlFile(devtoolsSqlPath, ['traces', 'spans', 'log_events', 'service_dependencies', 'replay_sessions']);
  verifySqlFile(ecommerceSqlPath, ['users', 'products', 'orders', 'order_items']);
  console.log('[SQL Verification] All database schemas and seed scripts verified successfully!');
  process.exit(0);
} catch (err) {
  console.error('[SQL Verification Failed]', err);
  process.exit(1);
}
