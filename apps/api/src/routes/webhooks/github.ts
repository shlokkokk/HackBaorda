// ═══════════════════════════════════════════════════════════
// GitHub Issues Webhook Handler
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from 'express';
import { getSupabase } from '../../db/client.js';
import { logger } from '../../lib/logger.js';
import { generateFingerprint } from '@sentinel/shared';
import { recordSourcePing } from '../../services/ingestionHealth.js';
import { calculateBreachAt, getOrgSLAConfig } from '../../services/sla.js';
import { eventBus } from '../../services/events.js';
import type { GitHubIssuePayload, Incident } from '@sentinel/shared';
import { validateOrgIdForIngestion } from '../../lib/orgValidation.js';

const log = logger.child({ source: 'github' });

export async function handleGitHubWebhook(
  payload: GitHubIssuePayload,
  req: Request,
  res: Response
): Promise<void> {
  const rawOrgId = (req.query['org_id'] as string) ?? (req.headers['x-org-id'] as string);
  const orgCheck = await validateOrgIdForIngestion(rawOrgId);
  if (!orgCheck.ok) {
    res.status(orgCheck.status).json({ error: orgCheck.error });
    return;
  }
  const orgId = orgCheck.orgId;

  // Only process opened issues with incident/outage labels
  if (payload.action !== 'opened' && payload.action !== 'labeled') {
    res.json({ status: 'skipped' });
    return;
  }

  const labels = payload.issue.labels.map((l) => l.name.toLowerCase());
  if (!labels.includes('incident') && !labels.includes('outage')) {
    res.json({ status: 'skipped', reason: 'no incident label' });
    return;
  }

  await recordSourcePing(orgId, 'github', true);

  const title = `[GitHub] ${payload.issue.title}`;
  const description = `${payload.issue.body}\n\n[View Issue](${payload.issue.html_url})\nRepo: ${payload.repository.full_name}\nOpened by: ${payload.issue.user.login}`;
  const severity = labels.includes('p0') ? 'P0' as const
    : labels.includes('p1') ? 'P1' as const
    : labels.includes('p2') ? 'P2' as const
    : 'P3' as const;

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
      source: 'github',
      source_id: String(payload.issue.id),
      affected_services: [],
      tags: ['github', ...labels],
      fingerprint: generateFingerprint({ title, description }),
      sla_breach_at: breachAt.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    log.error({ error }, 'Failed to create incident from GitHub');
    res.status(500).json({ error: 'Failed to create incident' });
    return;
  }

  eventBus.emitEvent('incident.created', { incident: data as Incident, orgId });
  res.status(201).json({ status: 'created', incident_id: data.id });
}
