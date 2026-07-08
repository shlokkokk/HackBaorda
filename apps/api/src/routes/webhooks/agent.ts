// ═══════════════════════════════════════════════════════════
// Chronicle Agent Webhook Handler — Alerts + Heartbeats
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from 'express';
import { getSupabase } from '../../db/client.js';
import { logger } from '../../lib/logger.js';
import { generateFingerprint } from '@chronicle/shared';
import { checkDuplicate } from '../../services/deduplication.js';
import { calculateBreachAt, getOrgSLAConfig } from '../../services/sla.js';
import { recordSourcePing } from '../../services/ingestionHealth.js';
import { eventBus } from '../../services/events.js';
import type { Incident, ChronicleAgentAlertPayload, ChronicleAgentHeartbeatPayload, Severity } from '@chronicle/shared';
import { validateOrgIdForIngestion } from '../../lib/orgValidation.js';

const log = logger.child({ source: 'chronicle-agent' });

export async function handleAgentWebhook(
  payload: ChronicleAgentAlertPayload | ChronicleAgentHeartbeatPayload,
  _req: Request,
  res: Response
): Promise<void> {
  const orgCheck = await validateOrgIdForIngestion(payload.org_id);
  if (!orgCheck.ok) {
    log.warn({ orgId: payload.org_id, error: orgCheck.error }, 'Invalid org_id in agent webhook');
    res.status(orgCheck.status).json({ error: orgCheck.error });
    return;
  }
  const orgId = orgCheck.orgId;

  // ─── HEARTBEAT ─────────────────────────────────────
  if (payload.type === 'heartbeat') {
    const hb = payload as ChronicleAgentHeartbeatPayload;
    log.debug({ hostname: hb.source.hostname, seq: hb.sequence_number }, 'Heartbeat received');

    await recordSourcePing(orgId, 'chronicle-agent', false);

    // Upsert host record
    const supabase = getSupabase();
    await supabase
      .from('hosts')
      .upsert({
        org_id: orgId,
        hostname: hb.source.hostname,
        host_id: hb.source.host_id,
        agent_version: hb.source.version,
        status: hb.health.status,
        last_heartbeat_at: hb.timestamp,
        collectors_active: hb.health.collectors.active,
        collectors_failed: hb.health.collectors.failed,
        baseline_status: hb.health.baseline_status,
        baseline_age_hours: hb.health.baseline_age_hours,
        circuit_breaker: hb.health.circuit_breaker,
        discovered_services: hb.health.discovered_services,
      }, { onConflict: 'org_id,host_id' });

    res.json({ status: 'ok' });
    return;
  }

  // ─── ALERT ─────────────────────────────────────────
  const alert = payload as ChronicleAgentAlertPayload;
  log.info({
    hostname: alert.source.hostname,
    alertTitle: alert.alert.title,
    severity: alert.alert.severity,
    sigma: alert.metric.baseline?.sigma ?? null,
  }, 'Agent alert received');

  await recordSourcePing(orgId, 'chronicle-agent', true);

  // If alert is "resolved" status, find and resolve matching incident
  if (alert.alert.status === 'resolved') {
    const supabase = getSupabase();
    const { data: existing } = await supabase
      .from('incidents')
      .select('*')
      .eq('org_id', orgId)
      .eq('source', 'chronicle-agent')
      .eq('fingerprint', alert.alert.fingerprint)
      .in('status', ['open', 'investigating', 'mitigating'])
      .single();

    if (existing) {
      await supabase
        .from('incidents')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', existing.id);

      eventBus.emitEvent('incident.resolved', { incident: existing as Incident, orgId });
      log.info({ incidentId: existing.id }, 'Agent auto-resolved incident');
    }

    res.json({ status: 'resolved' });
    return;
  }

  const severity = alert.alert.severity as Severity;
  const title = alert.alert.title;
  const baselineInfo = alert.metric.baseline
    ? `\n**Baseline:** mean=${alert.metric.baseline.mean}, σ=${alert.metric.baseline.sigma}`
    : '';
  const description = `${alert.alert.description}\n\n**Metric:** ${alert.metric.name} = ${alert.metric.value} ${alert.metric.unit}${baselineInfo}\n**Host:** ${alert.source.hostname} (${alert.source.platform}/${alert.source.arch})`;

  const fingerprint = alert.alert.fingerprint ?? generateFingerprint({
    title,
    description,
    affected_services: [alert.alert.service],
  });

  const existing = await checkDuplicate(orgId, {
    title, description, severity,
    affected_services: [alert.alert.service],
    source: 'chronicle-agent',
    source_id: alert.id,
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
      source: 'chronicle-agent',
      source_id: alert.id,
      affected_services: [alert.alert.service],
      tags: [
        'auto-detected',
        'chronicle-agent',
        alert.metric.baseline ? `sigma-${Math.round(alert.metric.baseline.sigma)}` : 'static-threshold',
      ],
      fingerprint,
      sla_breach_at: breachAt.toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    log.error({ error, orgId }, 'Failed to create incident from agent');
    const isUuidError = error?.code === '22P02';
    res.status(isUuidError ? 400 : 500).json({
      error: isUuidError
        ? `Invalid org_id "${orgId}". Run: pnpm setup:agent`
        : 'Failed to create incident',
    });
    return;
  }

  eventBus.emitEvent('incident.created', { incident: data as Incident, orgId });
  res.status(201).json({ status: 'created', incident_id: data.id });
}
