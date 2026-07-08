// Sync ShopFlow demo app env with Chronicle API + org from agent setup
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: 'apps/api/.env' });

const demoEnvPath = path.join('apps', 'demo', '.env.local');
const agentEnvPath = path.join('chronicle-agent', '.env');

function readEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const vars: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    vars[t.slice(0, eq)] = t.slice(eq + 1);
  }
  return vars;
}

function writeEnv(filePath: string, vars: Record<string, string>) {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(filePath, lines.join('\n') + '\n');
}

async function run() {
  console.log('🔧 ShopFlow Demo App Setup\n');

  const apiEnv = readEnv('apps/api/.env');
  const agentEnv = readEnv(agentEnvPath);
  const existing = readEnv(demoEnvPath);

  const orgId = agentEnv['ORG_ID'] ?? existing['CHRONICLE_ORG_ID'] ?? '';
  const webhookSecret = apiEnv['WEBHOOK_SECRET'] ?? agentEnv['WEBHOOK_SECRET'] ?? '';
  const apiUrl = apiEnv['API_URL'] ?? 'http://localhost:3001';

  if (!orgId) {
    console.error('❌ No ORG_ID found. Run  pnpm setup:agent  first.');
    process.exit(1);
  }

  const updated = {
    ...existing,
    CHRONICLE_API_URL: apiUrl,
    CHRONICLE_ORG_ID: orgId,
    CHRONICLE_WEBHOOK_SECRET: webhookSecret,
    NEXT_PUBLIC_CHRONICLE_DASHBOARD_URL: apiEnv['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
  };

  writeEnv(demoEnvPath, updated);

  console.log(`✅ Wrote ${demoEnvPath}`);
  console.log(`   CHRONICLE_ORG_ID=${orgId}`);
  console.log(`   CHRONICLE_API_URL=${apiUrl}`);
  console.log(`   CHRONICLE_WEBHOOK_SECRET=***${webhookSecret.slice(-6)}`);
  console.log('\n👉 Restart pnpm dev — chaos panel buttons will create live incidents.');
}

run();
