// ═══════════════════════════════════════════════════════════
// SLA Engine — Configurable per org, per severity
// ═══════════════════════════════════════════════════════════

import { getSupabase } from '../db/client.js';
import { logger } from '../lib/logger.js';
import { DEFAULT_SLA, formatDuration, SLA_CRITICAL_THRESHOLD } from '@sentinel/shared';
import type { Severity, SLAConfig } from '@sentinel/shared';

const log = logger.child({ service: 'sla' });

/**
 * Calculate SLA breach timestamp for an incident.
 */
export function calculateBreachAt(
  createdAt: Date,
  severity: Severity,
  slaConfig: SLAConfig = DEFAULT_SLA
): Date {
  const minutes = slaConfig[severity] ?? DEFAULT_SLA[severity];
  return new Date(createdAt.getTime() + minutes * 60 * 1000);
}

/**
 * Get SLA status for an incident.
 */
export function getSLAStatus(breachAt: Date, now: Date = new Date()) {
  const totalMs = breachAt.getTime() - now.getTime();
  const remainingMins = Math.max(0, Math.floor(totalMs / (1000 * 60)));
  const breached = totalMs <= 0;

  return {
    remaining_mins: remainingMins,
    remaining_formatted: formatDuration(remainingMins),
    breached,
    breach_at: breachAt.toISOString(),
    percentage: breached ? 0 : Math.min(100, (totalMs / (breachAt.getTime() - (breachAt.getTime() - totalMs))) * 100),
    is_critical: !breached && totalMs <= (totalMs / SLA_CRITICAL_THRESHOLD),
  };
}

/**
 * Get org's SLA config from database (with caching).
 */
export async function getOrgSLAConfig(orgId: string): Promise<SLAConfig> {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('orgs')
      .select('sla_config')
      .eq('id', orgId)
      .single();

    if (data?.sla_config) {
      return { ...DEFAULT_SLA, ...(data.sla_config as Partial<SLAConfig>) };
    }
  } catch (err) {
    log.warn({ err, orgId }, 'Failed to fetch org SLA config, using defaults');
  }
  return DEFAULT_SLA;
}

/**
 * Check all open incidents for SLA breaches and trigger alerts.
 */
export async function checkSLABreaches(orgId: string): Promise<Array<{
  incident_id: string;
  severity: string;
  remaining_mins: number;
  breached: boolean;
}>> {
  const supabase = getSupabase();

  const { data: incidents } = await supabase
    .from('incidents')
    .select('id, severity, sla_breach_at, status')
    .eq('org_id', orgId)
    .in('status', ['open', 'investigating', 'mitigating'])
    .not('sla_breach_at', 'is', null);

  if (!incidents) return [];

  const now = new Date();
  return incidents.map((inc) => {
    const breachAt = new Date(inc.sla_breach_at);
    const status = getSLAStatus(breachAt, now);
    return {
      incident_id: inc.id,
      severity: inc.severity,
      remaining_mins: status.remaining_mins,
      breached: status.breached,
    };
  });
}
