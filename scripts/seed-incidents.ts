import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const INCIDENTS = [
  {
    title: 'API Gateway timeout on /payments',
    description: 'Gateway experienced 504 gateway timeouts on the payments route. Traffic spike caused pool exhaustion.',
    severity: 'P1',
    status: 'resolved',
    affected_services: ['payments-api', 'gateway'],
    tags: ['auto-detected', 'high-priority'],
    source: 'chronicle-agent',
    root_cause: 'Postgres connection pool limit exceeded under high load.',
    resolution: 'Scaled postgres max connection pool to 200 using pgBouncer.',
    created_offset_min: 180, // minutes ago
    resolved_offset_min: 162,
    sla_offset_min: 120 // breach time = created_at + 60min (P1 target is 60m)
  },
  {
    title: 'Sentry: Unhandled ReferenceError in checkout flow',
    description: 'ReferenceError: checkoutToken is not defined at checkout-flow.js:145.',
    severity: 'P2',
    status: 'investigating',
    affected_services: ['checkout-ui'],
    tags: ['sentry', 'js-exception'],
    source: 'sentry',
    created_offset_min: 45,
    sla_offset_min: 195 // P2 target is 240m
  },
  {
    title: 'Database connection pool exhausted',
    description: 'Postgres DB connections hit 100% capacity threshold. Gateway connection timing out.',
    severity: 'P0',
    status: 'mitigating',
    affected_services: ['postgres-primary'],
    tags: ['auto-detected', 'cpu-spike'],
    source: 'chronicle-agent',
    created_offset_min: 12,
    sla_offset_min: 3 // P0 target is 15m
  },
  {
    title: 'Payments UI container OOM crash loop',
    description: 'Docker container payments-ui-prod crashed with exit code 137 (OOMKilled).',
    severity: 'P1',
    status: 'resolved',
    affected_services: ['payments-ui'],
    tags: ['docker-alert', 'crash'],
    source: 'chronicle-agent',
    root_cause: 'Webpack chunk size increase led to memory leak in production container.',
    resolution: 'Restarted container with memory limits bumped to 1Gi.',
    created_offset_min: 720,
    resolved_offset_min: 695,
    sla_offset_min: 660 // P1 target is 60m
  },
  {
    title: 'SSL Certificate Expiry warning',
    description: 'UptimeRobot SSL certification expiration threat. 4 days remaining before cert invalidates.',
    severity: 'P3',
    status: 'open',
    affected_services: ['gateway'],
    tags: ['ssl', 'warning'],
    source: 'uptimerobot',
    created_offset_min: 60,
    sla_offset_min: 1380 // P3 target is 1440m
  },
  {
    title: 'Manual: Slow response times on Search API',
    description: 'Reported by user feedback. Search queries taking 12s to return results.',
    severity: 'P3',
    status: 'resolved',
    affected_services: ['search-api'],
    tags: ['customer-report'],
    source: 'manual',
    root_cause: 'Full table scans running due to missing index on items description.',
    resolution: 'Added HNSW vector and index mappings to search fields in postgres.',
    created_offset_min: 1440,
    resolved_offset_min: 1390,
    sla_offset_min: 0 // P3 target is 1440m
  },
  {
    title: 'GitHub: Incident report regarding /auth crash',
    description: 'GitHub issue #141 created: Auth gateway crashes when token contains invalid email field shape.',
    severity: 'P2',
    status: 'resolved',
    affected_services: ['auth-service'],
    tags: ['github', 'bug'],
    source: 'github',
    root_cause: 'Email parser fails to check null fields inside token validation.',
    resolution: 'Merged patch PR resolving email verification logic checks.',
    created_offset_min: 1200,
    resolved_offset_min: 1100,
    sla_offset_min: 960 // P2 target is 240m
  },
  {
    title: 'Slack: Reported crash on payments retry button',
    description: 'Slack command alert: Retry button is throwing React errors on checkout page.',
    severity: 'P2',
    status: 'open',
    affected_services: ['checkout-ui', 'payments-api'],
    tags: ['slack-report'],
    source: 'slack',
    created_offset_min: 20,
    sla_offset_min: 220 // P2 target is 240m
  },
  {
    title: 'Memory exhaustion alert on cache nodes',
    description: 'Redis cluster cache-01 reached 99.8% memory usage capacity.',
    severity: 'P1',
    status: 'resolved',
    affected_services: ['cache'],
    tags: ['auto-detected', 'redis'],
    source: 'chronicle-agent',
    root_cause: 'Cache eviction policy set to volatile-lru instead of allkeys-lru.',
    resolution: 'Modified redis config to eviction policy allkeys-lru and run defrag.',
    created_offset_min: 300,
    resolved_offset_min: 275,
    sla_offset_min: 240 // P1 target is 60m
  },
  {
    title: 'Third party API webhook failures (Stripe)',
    description: 'Sentry alert: Stripe checkout webhook signatures validation failed. 100% fail rate.',
    severity: 'P1',
    status: 'investigating',
    affected_services: ['payments-api'],
    tags: ['sentry', 'external'],
    source: 'sentry',
    created_offset_min: 10,
    sla_offset_min: 50 // P1 target is 60m
  }
];

async function run() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in apps/api/.env');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey);
  console.log('🔌 Connecting to database to seed incidents...');

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

    console.log(`🌱 Seeding 10 realistic incidents under Org ID: ${orgId}...`);

    for (const inc of INCIDENTS) {
      const now = new Date();
      const createdAt = new Date(now.getTime() - inc.created_offset_min * 60 * 1000);
      const resolvedAt = inc.resolved_offset_min 
        ? new Date(now.getTime() - inc.resolved_offset_min * 60 * 1000) 
        : null;
      const slaBreachAt = new Date(createdAt.getTime() + (inc.sla_offset_min + inc.created_offset_min) * 60 * 1000);

      const { error } = await client.from('incidents').insert({
        org_id: orgId,
        title: inc.title,
        description: inc.description,
        severity: inc.severity,
        status: inc.status,
        affected_services: inc.affected_services,
        tags: inc.tags,
        source: inc.source,
        root_cause: inc.root_cause ?? null,
        resolution: inc.resolution ?? null,
        created_at: createdAt.toISOString(),
        resolved_at: resolvedAt ? resolvedAt.toISOString() : null,
        sla_breach_at: slaBreachAt.toISOString()
      });

      if (error) {
        console.error(`❌ Failed to seed incident "${inc.title}":`, error);
      } else {
        console.log(`✅ Seeded incident: "${inc.title}"`);
      }
    }
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

run();
