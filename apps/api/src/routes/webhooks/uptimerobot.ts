// ═══════════════════════════════════════════════════════════
// UptimeRobot Webhook Handler + Normalization
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from 'express';
import { getSupabase } from '../../db/client.js';
import { logger } from '../../lib/logger.js';
import { generateFingerprint } from '@chronicle/shared';
import { checkDuplicate } from '../../services/deduplication.js';
import { calculateBreachAt, getOrgSLAConfig } from '../../services/sla.js';
import { recordSourcePing } from '../../services/ingestionHealth.js';
import { eventBus } from '../../services/events.js';
import type { Incident, UptimeRobotPayload } from '@chronicle/shared';
import { validateOrgIdForIngestion } from '../../lib/orgValidation.js';

const log = logger.child({ source: 'uptimerobot' });

export async function handleUptimeRobotWebhook(
  payload: UptimeRobotPayload,
  req: Request,
  res: Response
): Promise<void> {
  log.info({ monitorId: payload.monitorID, alertType: payload.alertTypeFriendlyName }, 'UptimeRobot webhook received');

  const rawOrgId = (req.query['org_id'] as string) ?? (req.headers['x-org-id'] as string);
  const orgCheck = await validateOrgIdForIngestion(rawOrgId);
  if (!orgCheck.ok) {
    res.status(orgCheck.status).json({ error: orgCheck.error });
    return;
  }
  const orgId = orgCheck.orgId;

  // Record ping
  await recordSourcePing(orgId, 'uptimerobot', true);

  // Only create incident for "Down" alerts (alertType 1)
  if (payload.alertType !== '1') {
    log.info('Alert type is not "Down", skipping incident creation');
    res.json({ status: 'acknowledged', action: 'skipped' });
    return;
  }

  // Map alert to severity
  const severity = payload.alertDetails?.includes('500') ? 'P1' as const
    : payload.alertDetails?.includes('timeout') ? 'P2' as const
    : payload.alertDetails?.includes('DNS') ? 'P1' as const
    : 'P2' as const;

  // Extract service from URL
  const urlPath = new URL(payload.monitorURL).pathname;
  const service = urlPath.split('/').filter(Boolean).pop() ?? 'unknown';

  const title = `[UptimeRobot] ${payload.monitorFriendlyName} — ${payload.alertTypeFriendlyName}`;
  const description = `${payload.alertDetails}\n\nMonitor URL: ${payload.monitorURL}\nDuration: ${payload.alertDuration}s`;

  const fingerprint = generateFingerprint({
    title,
    description,
    affected_services: [service],
  });

  // Check dedup
  const existing = await checkDuplicate(orgId, {
    title, description, severity,
    affected_services: [service],
    source: 'uptimerobot',
    source_id: String(payload.monitorID),
    fingerprint,
  });

  if (existing) {
    res.json({ status: 'deduplicated', incident_id: existing.id });
    return;
  }

  // Create incident
  const supabase = getSupabase();
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
      source: 'uptimerobot',
      source_id: String(payload.monitorID),
      affected_services: [service],
      tags: ['auto-detected', 'uptimerobot'],
      fingerprint,
      sla_breach_at: breachAt.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    log.error({ error }, 'Failed to create incident from UptimeRobot');
    res.status(500).json({ error: 'Failed to create incident' });
    return;
  }

  eventBus.emitEvent('incident.created', { incident: data as Incident, orgId });

  log.info({ incidentId: data.id }, 'Incident created from UptimeRobot');
  res.status(201).json({ status: 'created', incident_id: data.id });
}
