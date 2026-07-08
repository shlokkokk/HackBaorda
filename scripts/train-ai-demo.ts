import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'apps/api/.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mem0Key = process.env.MEM0_API_KEY;

type IncidentSeed = {
  title: string;
  description: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  source: 'uptimerobot' | 'sentry' | 'chronicle-agent' | 'slack' | 'manual' | 'github';
  affected_services: string[];
  tags: string[];
  root_cause: string;
  resolution: string;
  commands_used: string[];
  lessons_learned: string;
  root_cause_category: string;
  time_to_resolve_mins: number;
};

type RunbookSeed = {
  title: string;
  incident_type: string;
  safe_to_automate: boolean;
  confidence_threshold: number;
  steps: Array<{ name: string; command?: string; description?: string }>;
};

const INCIDENTS: IncidentSeed[] = [
  {
    title: 'Payment authorization timeout during checkout',
    description: 'Stripe authorization calls exceeded 30 seconds. Customers saw pending transactions and retry loops.',
    severity: 'P1',
    source: 'chronicle-agent',
    affected_services: ['payments-api', 'checkout-ui', 'gateway'],
    tags: ['payments', 'transaction', 'timeout', 'stripe'],
    root_cause: 'Gateway retries amplified a slow Stripe authorization path while the payments connection pool was saturated.',
    resolution: 'Disabled duplicate retries, raised payments pool capacity, drained stuck workers, and replayed idempotent pending authorizations.',
    commands_used: [
      'kubectl scale deployment/payments-api --replicas=6',
      'kubectl rollout restart deployment/payments-worker',
      'redis-cli -h cache.internal del payments:retry-locks',
    ],
    lessons_learned: 'Use idempotency keys for every transaction retry and alert on retry amplification before pool saturation.',
    root_cause_category: 'payment-provider-timeout',
    time_to_resolve_mins: 18,
  },
  {
    title: 'Duplicate transaction charge risk after retry storm',
    description: 'Checkout retry button submitted multiple payment intents for the same cart when upstream latency increased.',
    severity: 'P0',
    source: 'sentry',
    affected_services: ['payments-api', 'checkout-ui'],
    tags: ['payments', 'transaction', 'idempotency', 'customer-impact'],
    root_cause: 'Client retry action did not pass the stable cart idempotency key to the payments API.',
    resolution: 'Hotfixed checkout to send cart_id as idempotency key, blocked duplicate payment intents, and reconciled pending charges.',
    commands_used: [
      'kubectl rollout undo deployment/checkout-ui',
      'node scripts/reconcile-pending-payments.js --window=2h',
      'redis-cli -h cache.internal set payments:duplicate-guard enabled',
    ],
    lessons_learned: 'Payment retries must be server-side idempotent and client buttons must disable while authorization is pending.',
    root_cause_category: 'idempotency-bug',
    time_to_resolve_mins: 24,
  },
  {
    title: 'Stripe webhook signature validation failed',
    description: 'All checkout.session.completed webhooks were rejected with signature mismatch after secret rotation.',
    severity: 'P1',
    source: 'sentry',
    affected_services: ['payments-api', 'webhook-router'],
    tags: ['stripe', 'webhook', 'secret-rotation'],
    root_cause: 'Stripe endpoint secret was rotated in Stripe dashboard but the runtime secret stayed stale.',
    resolution: 'Updated STRIPE_WEBHOOK_SECRET, redeployed payments-api, and replayed failed Stripe events from the dashboard.',
    commands_used: [
      'kubectl set env deployment/payments-api STRIPE_WEBHOOK_SECRET=<rotated_secret>',
      'kubectl rollout restart deployment/payments-api',
      'stripe events resend --latest --endpoint /api/webhooks/stripe',
    ],
    lessons_learned: 'Secret rotation needs a two-person checklist and synthetic webhook validation after deploy.',
    root_cause_category: 'secret-rotation',
    time_to_resolve_mins: 16,
  },
  {
    title: 'Payment status stuck in pending after worker backlog',
    description: 'Orders remained pending because payment settlement workers lagged behind the incoming transaction queue.',
    severity: 'P2',
    source: 'chronicle-agent',
    affected_services: ['payments-worker', 'orders-api', 'queue'],
    tags: ['payments', 'queue', 'worker-backlog'],
    root_cause: 'Worker concurrency was capped at 2 after a previous hotfix and queue depth crossed 25k jobs.',
    resolution: 'Raised worker concurrency to 12, scaled workers, and replayed settlement jobs with dead-letter monitoring.',
    commands_used: [
      'kubectl set env deployment/payments-worker WORKER_CONCURRENCY=12',
      'kubectl scale deployment/payments-worker --replicas=8',
      'node scripts/replay-dlq.js --queue=payment-settlement',
    ],
    lessons_learned: 'Track queue age, not just queue depth, for payment settlement health.',
    root_cause_category: 'worker-capacity',
    time_to_resolve_mins: 35,
  },
  {
    title: 'Gateway overload caused all APIs to return 503',
    description: 'Gateway rejected requests for checkout, search, auth, and payments with connection pool exhausted errors.',
    severity: 'P0',
    source: 'chronicle-agent',
    affected_services: ['gateway', 'postgres-primary', 'payments-api', 'search-api'],
    tags: ['gateway', 'database', 'pool-exhaustion', 'global-outage'],
    root_cause: 'Database max connections were exhausted by leaked gateway clients during a traffic spike.',
    resolution: 'Restarted gateway pods, killed idle database sessions, enabled pgBouncer pooling, and capped per-pod DB clients.',
    commands_used: [
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND now() - state_change > interval '5 minutes';",
      'kubectl rollout restart deployment/gateway',
      'kubectl set env deployment/gateway DB_POOL_MAX=20',
    ],
    lessons_learned: 'Every API service needs pool caps and the gateway should shed load before exhausting shared database capacity.',
    root_cause_category: 'db-pool-exhaustion',
    time_to_resolve_mins: 14,
  },
  {
    title: 'Checkout JavaScript crash blocked cart completion',
    description: 'ReferenceError checkoutToken is not defined after the latest checkout bundle deploy.',
    severity: 'P2',
    source: 'sentry',
    affected_services: ['checkout-ui'],
    tags: ['checkout', 'frontend', 'javascript'],
    root_cause: 'A checkout token variable was renamed in one component but not in the retry handler.',
    resolution: 'Rolled back checkout-ui to the last stable build and added a null-safe token guard in the retry handler.',
    commands_used: [
      'kubectl rollout undo deployment/checkout-ui',
      'pnpm test --filter=@chronicle/demo',
    ],
    lessons_learned: 'Checkout deploys need smoke tests for initial submit, retry, and abandoned-cart resume paths.',
    root_cause_category: 'frontend-regression',
    time_to_resolve_mins: 22,
  },
  {
    title: 'Search API p99 latency crossed 12 seconds',
    description: 'Product search became slow for broad queries and blocked checkout recommendations.',
    severity: 'P3',
    source: 'manual',
    affected_services: ['search-api', 'postgres-primary'],
    tags: ['search', 'latency', 'indexing'],
    root_cause: 'New product description filters caused sequential scans because the GIN index was missing.',
    resolution: 'Added a GIN index on product search fields, vacuum analyzed the table, and cached top category queries.',
    commands_used: [
      'CREATE INDEX CONCURRENTLY idx_products_search ON products USING gin(search_vector);',
      'VACUUM ANALYZE products;',
    ],
    lessons_learned: 'Index migrations must ship with feature flags for new search filters.',
    root_cause_category: 'missing-index',
    time_to_resolve_mins: 42,
  },
  {
    title: 'Redis cache memory hit 99 percent',
    description: 'Cache nodes rejected writes and session reads became inconsistent.',
    severity: 'P1',
    source: 'chronicle-agent',
    affected_services: ['cache', 'gateway', 'checkout-ui'],
    tags: ['redis', 'memory', 'cache'],
    root_cause: 'Eviction policy was volatile-lru while most checkout/session keys had no TTL.',
    resolution: 'Changed Redis eviction policy to allkeys-lru, added TTLs for session keys, and ran active defrag.',
    commands_used: [
      'redis-cli CONFIG SET maxmemory-policy allkeys-lru',
      'redis-cli MEMORY PURGE',
      'redis-cli CONFIG SET activedefrag yes',
    ],
    lessons_learned: 'Cache policies must match key TTL strategy; checkout/session keys need enforced expiry.',
    root_cause_category: 'cache-configuration',
    time_to_resolve_mins: 25,
  },
  {
    title: 'Auth service rejected valid login tokens',
    description: 'Users could not sign in after a token parser deployment changed email claim handling.',
    severity: 'P1',
    source: 'github',
    affected_services: ['auth-service', 'gateway'],
    tags: ['auth', 'token-parser', 'login'],
    root_cause: 'Email claim parser assumed a string but Clerk sent an array for some federated accounts.',
    resolution: 'Patched parser to normalize email claim shapes and rolled auth-service forward with regression tests.',
    commands_used: [
      'kubectl rollout restart deployment/auth-service',
      'pnpm test --filter=@chronicle/api auth',
    ],
    lessons_learned: 'Auth parsers need contract tests for federated identity edge cases.',
    root_cause_category: 'schema-assumption',
    time_to_resolve_mins: 31,
  },
  {
    title: 'SSL certificate expiring on API gateway',
    description: 'Uptime monitor warned that the gateway certificate would expire within four days.',
    severity: 'P3',
    source: 'uptimerobot',
    affected_services: ['gateway'],
    tags: ['ssl', 'certificate', 'uptime'],
    root_cause: 'Certbot renewal job failed after DNS challenge credentials expired.',
    resolution: 'Rotated DNS challenge credentials, renewed the certificate, and restarted ingress to load the new cert.',
    commands_used: [
      'certbot renew --force-renewal',
      'kubectl rollout restart deployment/ingress-gateway',
    ],
    lessons_learned: 'Certificate automation needs monitor coverage for renewal-job failure, not just expiry date.',
    root_cause_category: 'certificate-renewal',
    time_to_resolve_mins: 20,
  },
];

const RUNBOOKS: RunbookSeed[] = [
  {
    title: 'Payment timeout and transaction retry storm',
    incident_type: 'payment-timeout',
    safe_to_automate: false,
    confidence_threshold: 0.88,
    steps: [
      { name: 'Confirm payment health', command: 'curl -i $DEMO_APP_URL/api/payments' },
      { name: 'Check retry amplification', command: 'kubectl logs deployment/payments-api --tail=200 | grep retry' },
      { name: 'Scale payments API', command: 'kubectl scale deployment/payments-api --replicas=6' },
      { name: 'Drain stuck workers', command: 'kubectl rollout restart deployment/payments-worker' },
      { name: 'Reconcile pending payments', command: 'node scripts/reconcile-pending-payments.js --window=2h' },
    ],
  },
  {
    title: 'Stripe webhook validation recovery',
    incident_type: 'webhook-secret-rotation',
    safe_to_automate: false,
    confidence_threshold: 0.92,
    steps: [
      { name: 'Verify endpoint secret', description: 'Compare Stripe dashboard endpoint secret with STRIPE_WEBHOOK_SECRET.' },
      { name: 'Rotate runtime secret', command: 'kubectl set env deployment/payments-api STRIPE_WEBHOOK_SECRET=<rotated_secret>' },
      { name: 'Restart payments API', command: 'kubectl rollout restart deployment/payments-api' },
      { name: 'Replay failed Stripe events', command: 'stripe events resend --latest --endpoint /api/webhooks/stripe' },
    ],
  },
  {
    title: 'Database pool exhaustion rapid mitigation',
    incident_type: 'db-pool-exhaustion',
    safe_to_automate: true,
    confidence_threshold: 0.9,
    steps: [
      { name: 'Inspect active sessions', command: "SELECT pid, state, query FROM pg_stat_activity WHERE state != 'idle' LIMIT 20;" },
      { name: 'Kill stale idle sessions', command: "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND now() - state_change > interval '5 minutes';" },
      { name: 'Restart gateway', command: 'kubectl rollout restart deployment/gateway' },
      { name: 'Cap per-pod pools', command: 'kubectl set env deployment/gateway DB_POOL_MAX=20' },
    ],
  },
  {
    title: 'Checkout frontend regression rollback',
    incident_type: 'frontend-regression',
    safe_to_automate: false,
    confidence_threshold: 0.84,
    steps: [
      { name: 'Confirm Sentry issue', command: 'sentry-cli issues list --query checkoutToken' },
      { name: 'Rollback checkout UI', command: 'kubectl rollout undo deployment/checkout-ui' },
      { name: 'Run checkout smoke tests', command: 'pnpm test --filter=@chronicle/demo checkout' },
    ],
  },
  {
    title: 'Search latency missing index fix',
    incident_type: 'search-latency',
    safe_to_automate: false,
    confidence_threshold: 0.86,
    steps: [
      { name: 'Find slow queries', command: "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;" },
      { name: 'Create search index', command: 'CREATE INDEX CONCURRENTLY idx_products_search ON products USING gin(search_vector);' },
      { name: 'Refresh planner stats', command: 'VACUUM ANALYZE products;' },
    ],
  },
  {
    title: 'Redis memory pressure recovery',
    incident_type: 'cache-memory',
    safe_to_automate: true,
    confidence_threshold: 0.91,
    steps: [
      { name: 'Inspect memory', command: 'redis-cli INFO memory' },
      { name: 'Set eviction policy', command: 'redis-cli CONFIG SET maxmemory-policy allkeys-lru' },
      { name: 'Purge allocator memory', command: 'redis-cli MEMORY PURGE' },
      { name: 'Enable defrag', command: 'redis-cli CONFIG SET activedefrag yes' },
    ],
  },
  {
    title: 'SSL certificate renewal',
    incident_type: 'ssl-expiry',
    safe_to_automate: true,
    confidence_threshold: 0.97,
    steps: [
      { name: 'Check certificate dates', command: 'openssl s_client -connect api.gateway.internal:443 -servername api.gateway.internal | openssl x509 -noout -dates' },
      { name: 'Renew certificate', command: 'certbot renew --force-renewal' },
      { name: 'Restart ingress', command: 'kubectl rollout restart deployment/ingress-gateway' },
    ],
  },
];

function createDeterministicEmbedding(text: string): number[] {
  const normalized = text.toLowerCase();
  const embedding = new Array(1536).fill(0);

  for (let i = 0; i < normalized.length; i++) {
    const idx = normalized.charCodeAt(i) % 1536;
    embedding[idx] = (embedding[idx] ?? 0) + 1;
  }

  for (const word of normalized.split(/\s+/)) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash + word.charCodeAt(i)) & 0xffffffff;
    }
    embedding[Math.abs(hash) % 1536] += 0.5;
  }

  const magnitude = Math.sqrt(embedding.reduce((sum, value) => sum + value * value, 0));
  return magnitude > 0 ? embedding.map((value) => value / magnitude) : embedding;
}

function incidentText(incident: IncidentSeed): string {
  return [
    incident.title,
    incident.description,
    `Services: ${incident.affected_services.join(', ')}`,
    `Root cause: ${incident.root_cause}`,
    `Resolution: ${incident.resolution}`,
    `Commands: ${incident.commands_used.join('; ')}`,
    `Tags: ${incident.tags.join(', ')}`,
  ].join('\n');
}

function runbookText(runbook: RunbookSeed): string {
  return [
    runbook.title,
    runbook.incident_type,
    runbook.steps.map((step) => `${step.name} ${step.command ?? ''} ${step.description ?? ''}`).join('\n'),
  ].join('\n');
}

async function getOrgId(client: ReturnType<typeof createClient>): Promise<string> {
  const { data: orgs, error } = await client.from('orgs').select('id').limit(1);
  if (error) throw error;
  if (orgs?.[0]?.id) return orgs[0].id as string;

  const { data: org, error: createError } = await client
    .from('orgs')
    .insert({ name: 'Chronicle DevOps' })
    .select('id')
    .single();

  if (createError || !org) throw createError ?? new Error('Failed to create default org');
  return org.id as string;
}

async function upsertIncident(client: ReturnType<typeof createClient>, orgId: string, incident: IncidentSeed): Promise<string> {
  const now = new Date();
  const createdAt = new Date(now.getTime() - incident.time_to_resolve_mins * 3 * 60 * 1000);
  const resolvedAt = new Date(createdAt.getTime() + incident.time_to_resolve_mins * 60 * 1000);
  const embedding = createDeterministicEmbedding(incidentText(incident));

  const existing = await client
    .from('incidents')
    .select('id, mem0_memory_ids')
    .eq('org_id', orgId)
    .eq('title', incident.title)
    .maybeSingle();

  const payload = {
    org_id: orgId,
    title: incident.title,
    description: incident.description,
    severity: incident.severity,
    status: 'resolved',
    affected_services: incident.affected_services,
    tags: incident.tags,
    source: incident.source,
    root_cause: incident.root_cause,
    resolution: incident.resolution,
    created_at: createdAt.toISOString(),
    resolved_at: resolvedAt.toISOString(),
    sla_breach_at: new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString(),
    embedding,
  };

  if (existing.data?.id) {
    const { error } = await client.from('incidents').update(payload).eq('id', existing.data.id);
    if (error) throw error;
    return existing.data.id as string;
  }

  const { data, error } = await client.from('incidents').insert(payload).select('id').single();
  if (error || !data) throw error ?? new Error(`Failed to insert ${incident.title}`);
  return data.id as string;
}

async function upsertRunbook(client: ReturnType<typeof createClient>, orgId: string, runbook: RunbookSeed): Promise<string> {
  const embedding = createDeterministicEmbedding(runbookText(runbook));
  const existing = await client
    .from('runbooks')
    .select('id')
    .eq('org_id', orgId)
    .eq('title', runbook.title)
    .maybeSingle();

  const payload = {
    org_id: orgId,
    title: runbook.title,
    incident_type: runbook.incident_type,
    steps: runbook.steps,
    safe_to_automate: runbook.safe_to_automate,
    confidence_threshold: runbook.confidence_threshold,
    embedding,
  };

  if (existing.data?.id) {
    const { error } = await client.from('runbooks').update(payload).eq('id', existing.data.id);
    if (error) throw error;
    return existing.data.id as string;
  }

  const { data, error } = await client.from('runbooks').insert(payload).select('id').single();
  if (error || !data) throw error ?? new Error(`Failed to insert ${runbook.title}`);
  return data.id as string;
}

async function writeMem0Learning(
  client: ReturnType<typeof createClient>,
  orgId: string,
  incidentId: string,
  incident: IncidentSeed
): Promise<void> {
  if (!mem0Key) return;

  const { data } = await client
    .from('incidents')
    .select('mem0_memory_ids')
    .eq('id', incidentId)
    .single();

  const existingIds = Array.isArray(data?.mem0_memory_ids) ? data.mem0_memory_ids as string[] : [];
  if (existingIds.length > 0) return;

  const content = `Incident: "${incident.title}". Symptoms: ${incident.description}. Affected services: ${incident.affected_services.join(', ')}. Root cause: ${incident.root_cause}. Resolution: ${incident.resolution}. Commands: ${incident.commands_used.join('; ')}. Lessons: ${incident.lessons_learned}.`;

  const response = await fetch('https://api.mem0.ai/v1/memories/', {
    method: 'POST',
    headers: {
      Authorization: `Token ${mem0Key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content }],
      user_id: `org_${orgId}`,
      metadata: {
        incident_id: incidentId,
        title: incident.title,
        affected_services: incident.affected_services,
        root_cause_category: incident.root_cause_category,
        root_cause: incident.root_cause,
        symptoms: incident.tags,
        effective_fix: incident.resolution,
        commands_used: incident.commands_used,
        time_to_detect_mins: 5,
        time_to_resolve_mins: incident.time_to_resolve_mins,
        severity: incident.severity,
        sla_breached: false,
        tags: incident.tags,
        lessons_learned: incident.lessons_learned,
        postmortem_id: null,
        source: incident.source,
        detection_sources: [incident.source],
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mem0 write failed for "${incident.title}": ${errorText}`);
  }

  const result = await response.json() as { id?: string } | Array<{ id?: string }>;
  const memoryId = Array.isArray(result) ? result[0]?.id : result.id;
  if (!memoryId) return;

  await client
    .from('incidents')
    .update({ mem0_memory_ids: [memoryId] })
    .eq('id', incidentId);
}

async function run() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in apps/api/.env');
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseKey);
  const orgId = await getOrgId(client);

  console.log(`Training Chronicle AI demo corpus for org ${orgId}`);

  for (const incident of INCIDENTS) {
    const id = await upsertIncident(client, orgId, incident);
    await writeMem0Learning(client, orgId, id, incident);
    console.log(`Trained incident memory: ${incident.title}`);
  }

  for (const runbook of RUNBOOKS) {
    await upsertRunbook(client, orgId, runbook);
    console.log(`Trained runbook: ${runbook.title}`);
  }

  console.log(`Done. ${INCIDENTS.length} incident memories and ${RUNBOOKS.length} runbooks are ready for retrieval.`);
}

run().catch((err) => {
  console.error('AI training failed:', err);
  process.exit(1);
});
