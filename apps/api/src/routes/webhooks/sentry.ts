// ═══════════════════════════════════════════════════════════
// Sentry Webhook Handler + Normalization
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from 'express';
import { getSupabase } from '../../db/client.js';
import { logger } from '../../lib/logger.js';
import { generateFingerprint, sentryLevelToSeverity } from '@chronicle/shared';
import { checkDuplicate } from '../../services/deduplication.js';
import { calculateBreachAt, getOrgSLAConfig } from '../../services/sla.js';
import { recordSourcePing } from '../../services/ingestionHealth.js';
import { eventBus } from '../../services/events.js';
import type { Incident, SentryPayload } from '@chronicle/shared';
import { validateOrgIdForIngestion } from '../../lib/orgValidation.js';

const log = logger.child({ source: 'sentry' });

export async function handleSentryWebhook(
  payload: SentryPayload,
  req: Request,
  res: Response
): Promise<void> {
  log.info({ eventId: payload.id, level: payload.level }, 'Sentry webhook received');

  const rawOrgId = (req.query['org_id'] as string) ?? (req.headers['x-org-id'] as string);
  const orgCheck = await validateOrgIdForIngestion(rawOrgId);
  if (!orgCheck.ok) {
    res.status(orgCheck.status).json({ error: orgCheck.error });
    return;
  }
  const orgId = orgCheck.orgId;

  await recordSourcePing(orgId, 'sentry', true);

  const severity = sentryLevelToSeverity(payload.level);

  // Extract service from culprit or tags
  const serviceTags = payload.event?.tags?.filter(([key]) => key === 'service') ?? [];
  const service = serviceTags[0]?.[1] ?? payload.culprit?.split('/')[0] ?? 'unknown';

  const title = `[Sentry] ${payload.culprit} — ${payload.message}`;
  const description = `**Project:** ${payload.project_name}\n**Level:** ${payload.level}\n**Message:** ${payload.message}\n\n[View in Sentry](${payload.url})`;

  const fingerprint = generateFingerprint({
    title,
    description,
    affected_services: [service],
  });

  const existing = await checkDuplicate(orgId, {
    title, description, severity,
    affected_services: [service],
    source: 'sentry',
    source_id: payload.id,
    fingerprint,
  });

  if (existing) {
    res.json({ status: 'deduplicated', incident_id: existing.id });
    return;
  }

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
      source: 'sentry',
      source_id: payload.id,
      affected_services: [service],
      tags: ['auto-detected', 'sentry', payload.level],
      fingerprint,
      sla_breach_at: breachAt.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    log.error({ error }, 'Failed to create incident from Sentry');
    res.status(500).json({ error: 'Failed to create incident' });
    return;
  }

  eventBus.emitEvent('incident.created', { incident: data as Incident, orgId });

  log.info({ incidentId: data.id }, 'Incident created from Sentry');
  res.status(201).json({ status: 'created', incident_id: data.id });
}
