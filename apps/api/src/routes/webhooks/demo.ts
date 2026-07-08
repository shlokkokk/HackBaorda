// ═══════════════════════════════════════════════════════════
// ShopFlow Demo App Webhook — Creates real incidents in Chronicle
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from 'express';
import { getSupabase } from '../../db/client.js';
import { logger } from '../../lib/logger.js';
import { validateOrgIdForIngestion } from '../../lib/orgValidation.js';
import { checkDuplicate } from '../../services/deduplication.js';
import { calculateBreachAt, getOrgSLAConfig } from '../../services/sla.js';
import { recordSourcePing } from '../../services/ingestionHealth.js';
import { eventBus } from '../../services/events.js';
import type { Incident, IncidentSource, Severity } from '@chronicle/shared';

const log = logger.child({ source: 'demo-app' });

export interface DemoScenarioPayload {
  scenario: string;
  active: boolean;
  label?: string;
  severity?: string;
  chronicle_source?: string;
}

const SCENARIO_DEFAULTS: Record<
  string,
  { title: string; description: string; source: IncidentSource; severity: Severity; services: string[] }
> = {
  health_down: {
    title: '[ShopFlow] Health endpoint returning HTTP 503',
    description: 'UptimeRobot monitor detected ShopFlow /api/health is down. Service unavailable.',
    source: 'uptimerobot',
    severity: 'P3',
    services: ['shopflow-api', 'gateway'],
  },
  payment_timeout: {
    title: '[ShopFlow] API Gateway timeout on /payments',
    description: 'Payment route returned 504 Gateway Timeout after 8s. Pool may be exhausted.',
    source: 'chronicle-agent',
    severity: 'P1',
    services: ['payments-api', 'gateway'],
  },
  checkout_bug: {
    title: '[Sentry] Unhandled ReferenceError in checkout flow',
    description: 'ReferenceError: checkoutToken is not defined at checkout-flow.js:145',
    source: 'sentry',
    severity: 'P2',
    services: ['checkout-ui'],
  },
  stripe_webhook_fail: {
    title: '[Sentry] Stripe webhook signature validation failed',
    description: 'Stripe checkout webhook signatures validation failed. 100% fail rate.',
    source: 'sentry',
    severity: 'P1',
    services: ['payments-api'],
  },
  search_slow: {
    title: '[ShopFlow] Slow response times on Search API',
    description: 'Search queries taking ~12 seconds. Full table scan — missing index on description.',
    source: 'manual',
    severity: 'P3',
    services: ['search-api'],
  },
  gateway_overload: {
    title: '[ShopFlow] Database connection pool exhausted',
    description: 'All API routes returning 503. Gateway connection pool at 100% capacity.',
    source: 'chronicle-agent',
    severity: 'P0',
    services: ['postgres-primary', 'gateway'],
  },
};

function fingerprintFor(scenario: string): string {
  return `shopflow-demo:${scenario}`;
}

export async function handleDemoWebhook(
  payload: DemoScenarioPayload,
  req: Request,
  res: Response
): Promise<void> {
  const rawOrgId = (req.query['org_id'] as string) ?? (req.headers['x-org-id'] as string);
  const orgValidation = await validateOrgIdForIngestion(rawOrgId);
  if (!orgValidation.ok) {
    res.status(orgValidation.status).json({ error: orgValidation.error });
    return;
  }
  const orgId = orgValidation.orgId;

  const defaults = SCENARIO_DEFAULTS[payload.scenario];
  if (!defaults) {
    res.status(400).json({ error: `Unknown scenario: ${payload.scenario}` });
    return;
  }

  const source = (payload.chronicle_source as IncidentSource) ?? defaults.source;
  await recordSourcePing(orgId, source, true);

  const supabase = getSupabase();
  const fp = fingerprintFor(payload.scenario);

  if (!payload.active) {
    const { data: existing } = await supabase
      .from('incidents')
      .select('*')
      .eq('org_id', orgId)
      .eq('fingerprint', fp)
      .in('status', ['open', 'investigating', 'mitigating'])
      .maybeSingle();

    if (existing) {
      await supabase
        .from('incidents')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolution: 'Demo scenario deactivated — service restored.' })
        .eq('id', existing.id);
      eventBus.emitEvent('incident.resolved', { incident: existing as Incident, orgId });
      log.info({ scenario: payload.scenario, incidentId: existing.id }, 'Demo scenario resolved');
    }

    res.json({ status: 'resolved', scenario: payload.scenario });
    return;
  }

  const title = defaults.title;
  const description = defaults.description;
  const severity = (payload.severity as Severity) ?? defaults.severity;

  const existing = await checkDuplicate(orgId, {
    title,
    description,
    severity,
    affected_services: defaults.services,
    source,
    source_id: `demo-${payload.scenario}`,
    fingerprint: fp,
  });

  if (existing) {
    res.json({ status: 'deduplicated', incident_id: existing.id });
    return;
  }

  const slaConfig = await getOrgSLAConfig(orgId);
  const breachAt = calculateBreachAt(new Date(), severity, slaConfig);

  const { data, error } = await supabase
    .from('incidents')
    .insert({
      org_id: orgId,
      title,
      description,
      severity,
      status: 'open',
      source,
      source_id: `demo-${payload.scenario}-${Date.now()}`,
      affected_services: defaults.services,
      tags: ['shopflow-demo', 'chaos-engineering', payload.scenario],
      fingerprint: fp,
      sla_breach_at: breachAt.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    log.error({ error }, 'Failed to create demo incident');
    res.status(500).json({ error: 'Failed to create incident' });
    return;
  }

  eventBus.emitEvent('incident.created', { incident: data as Incident, orgId });
  log.info({ scenario: payload.scenario, incidentId: data.id }, 'Demo incident created');

  res.status(201).json({ status: 'created', incident_id: data.id, scenario: payload.scenario });
}
