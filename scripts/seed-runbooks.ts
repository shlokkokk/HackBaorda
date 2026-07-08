import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RUNBOOKS = [
  {
    title: 'Database connection pool exhausted',
    incident_type: 'resource-exhaustion',
    steps: [
      { name: 'List active queries', command: "SELECT pid, query, state, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state != 'idle' ORDER BY age DESC LIMIT 10;" },
      { name: 'Terminate blocking queries', command: 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE age(clock_timestamp(), query_start) > interval \'5 minutes\';' },
      { name: 'Scale Postgres Connection Pool Max limit', description: 'Modify pool config or scale pgBouncer capacity' }
    ],
    safe_to_automate: true,
    confidence_threshold: 0.90
  },
  {
    title: 'API Gateway timeout on /checkout',
    incident_type: 'deployment-error',
    steps: [
      { name: 'Check gateway docker logs', command: 'docker logs --tail 100 gateway' },
      { name: 'Flush Redis session keys', command: 'redis-cli -h cache.internal flushdb' },
      { name: 'Perform deployment rollback to last stable SHA', command: 'git revert HEAD && git push origin main' }
    ],
    safe_to_automate: false,
    confidence_threshold: 0.85
  },
  {
    title: 'Memory Leak on Checkout UI microservice',
    incident_type: 'resource-exhaustion',
    steps: [
      { name: 'Profile node memory footprint', command: 'node --inspect memory-leak-detector.js' },
      { name: 'Force Docker container restart', command: 'docker container restart checkout-ui' }
    ],
    safe_to_automate: true,
    confidence_threshold: 0.95
  },
  {
    title: 'Kubernetes Pod OOMKilled Anomaly',
    incident_type: 'resource-exhaustion',
    steps: [
      { name: 'Identify OOMKilled events', command: 'kubectl get events --field-selector reason=OOMKilled' },
      { name: 'Increase container memory limits to 2Gi', command: 'kubectl set resources deployment/payments-api --limits=memory=2Gi' }
    ],
    safe_to_automate: true,
    confidence_threshold: 0.88
  },
  {
    title: 'SSL Certificate Expiry Threat',
    incident_type: 'ssl-expiry',
    steps: [
      { name: 'Verify cert expiration dates', command: 'openssl s_client -connect api.gateway.internal:443 -servername api.gateway.internal | openssl x509 -noout -dates' },
      { name: 'Auto-renew Certbot SSL credentials', command: 'certbot renew --force-renewal' }
    ],
    safe_to_automate: true,
    confidence_threshold: 0.99
  }
];

async function run() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in apps/api/.env');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey);
  console.log('🔌 Connecting to database to seed runbooks...');

  try {
    // Get first org
    let { data: orgs, error: orgError } = await client.from('orgs').select('*').limit(1);
    if (orgError) throw orgError;

    let orgId: string;
    if (!orgs || orgs.length === 0) {
      console.log('🌱 No organization found, creating "Chronicle DevOps" default org...');
      const { data: newOrg, error: createError } = await client
        .from('orgs')
        .insert({ name: 'Chronicle DevOps' })
        .select()
        .single();
      if (createError || !newOrg) throw createError || new Error('Failed to create default org');
      orgId = newOrg.id;
    } else {
      orgId = orgs[0]!.id;
    }

    console.log(`🌱 Seeding runbooks under Org ID: ${orgId}...`);

    for (const rb of RUNBOOKS) {
      const { error } = await client.from('runbooks').insert({
        org_id: orgId,
        title: rb.title,
        incident_type: rb.incident_type,
        steps: rb.steps,
        safe_to_automate: rb.safe_to_automate,
        confidence_threshold: rb.confidence_threshold,
      });

      if (error) {
        console.error(`❌ Failed to seed runbook "${rb.title}":`, error);
      } else {
        console.log(`✅ Seeded runbook: "${rb.title}"`);
      }
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

run();
