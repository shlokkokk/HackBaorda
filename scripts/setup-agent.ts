// ═══════════════════════════════════════════════════════════
// Sentinel Agent Setup — Auto-configure ORG_ID + WEBHOOK_SECRET
// ═══════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { isValidOrgId } from '../packages/shared/src/utils/uuid';

dotenv.config({ path: 'apps/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const agentEnvPath = path.join('sentinel-agent', '.env');

function readEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf-8');
  const vars: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
  }
  return vars;
}

function writeEnvFile(filePath: string, vars: Record<string, string>) {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf-8');
}

async function run() {
  console.log('🔧 Sentinel Agent Setup\n');

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in apps/api/.env');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey);
  const agentEnv = readEnvFile(agentEnvPath);
  const currentOrgId = agentEnv['ORG_ID'] ?? '';

  if (isValidOrgId(currentOrgId)) {
    const { data } = await client.from('orgs').select('id,name').eq('id', currentOrgId).maybeSingle();
    if (data) {
      console.log(`✅ ORG_ID already configured: ${currentOrgId} (${data.name})`);
      return;
    }
    console.log(`⚠️ ORG_ID ${currentOrgId} not found in database — will re-resolve...`);
  } else {
    console.log(`⚠️ ORG_ID is missing or invalid: "${currentOrgId || '(empty)'}"`);
  }

  const { data: orgs, error } = await client
    .from('orgs')
    .select('id,name,created_at')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Failed to query orgs table:', error.message);
    console.log('👉 Run schema.sql in Supabase first, then sign up at http://localhost:3000');
    process.exit(1);
  }

  let orgId: string | undefined;

  if (!orgs || orgs.length === 0) {
    console.log('🌱 No organization found — creating default "Sentinel DevOps" org...');
    const { data: newOrg, error: createError } = await client
      .from('orgs')
      .insert({ name: 'Sentinel DevOps' })
      .select()
      .single();

    if (createError || !newOrg) {
      console.error('❌ Failed to create default org:', createError?.message);
      process.exit(1);
    }
    orgId = newOrg.id;
    console.log(`✅ Created org: ${newOrg.name} (${orgId})`);
  } else if (orgs.length === 1) {
    orgId = orgs[0]!.id;
    console.log(`✅ Using org: ${orgs[0]!.name} (${orgId})`);
  } else {
    console.log('📋 Multiple organizations found:');
    orgs.forEach((o, i) => console.log(`   ${i + 1}. ${o.name} — ${o.id}`));
    orgId = orgs[0]!.id;
    console.log(`\n✅ Defaulting to first org: ${orgs[0]!.name} (${orgId})`);
    console.log('   To use a different org, set ORG_ID manually in sentinel-agent/.env');
  }

  // Sync webhook secret from API env if available
  const webhookSecret =
    process.env.WEBHOOK_SECRET ||
    agentEnv['WEBHOOK_SECRET'] ||
    '';

  const updatedEnv = {
    ...agentEnv,
    ORG_ID: orgId,
    SENTINEL_WEBHOOK_URL: agentEnv['SENTINEL_WEBHOOK_URL'] || 'http://localhost:3001/api/webhooks/ingest',
    ...(webhookSecret ? { WEBHOOK_SECRET: webhookSecret } : {}),
  };

  if (!fs.existsSync(path.dirname(agentEnvPath))) {
    fs.mkdirSync(path.dirname(agentEnvPath), { recursive: true });
  }

  writeEnvFile(agentEnvPath, updatedEnv);

  // Link any users missing org_id to this org (common after Clerk signup before webhook fix)
  const { data: orphanUsers } = await client
    .from('users')
    .select('id,email')
    .is('org_id', null);

  if (orphanUsers && orphanUsers.length > 0) {
    await client
      .from('users')
      .update({ org_id: orgId, role: 'admin' })
      .is('org_id', null);
    console.log(`\n🔗 Linked ${orphanUsers.length} user(s) without org to ${orgId}`);
  }

  // Ensure ingestion health rows exist
  const { data: healthRows } = await client
    .from('ingestion_health')
    .select('id')
    .eq('org_id', orgId)
    .limit(1);

  if (!healthRows || healthRows.length === 0) {
    const sources = ['uptimerobot', 'sentry', 'sentinel-agent', 'slack', 'manual', 'github'];
    await client.from('ingestion_health').upsert(
      sources.map((source) => ({
        org_id: orgId,
        source,
        status: source === 'manual' ? 'healthy' : 'stale',
        last_ping_at: new Date().toISOString(),
        total_incidents: 0,
      })),
      { onConflict: 'org_id,source' }
    );
    console.log('📡 Initialized ingestion health entries for org');
  }

  console.log(`\n🎉 Updated ${agentEnvPath}`);
  console.log(`   ORG_ID=${orgId}`);
  if (webhookSecret) {
    console.log(`   WEBHOOK_SECRET=***${webhookSecret.slice(-6)}`);
  } else {
    console.log('   ⚠️ WEBHOOK_SECRET not set — add it to apps/api/.env and re-run setup:agent');
  }
  console.log('\n👉 Restart pnpm dev for changes to take effect.');
}

run();
