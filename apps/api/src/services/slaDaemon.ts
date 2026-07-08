// ═══════════════════════════════════════════════════════════
// SLA Auto-Escalation Daemon
// Runs in the background to monitor open incidents,
// handle SLA breaches, and enforce severity auto-escalation.
// ═══════════════════════════════════════════════════════════

import { getSupabase } from '../db/client.js';
import { logger } from '../lib/logger.js';
import { config } from '../lib/config.js';
import { eventBus } from './events.js';
import { calculateBreachAt, getOrgSLAConfig } from './sla.js';
import { sendSlackMessage } from './slack.js';
import type { Severity, Incident } from '@chronicle/shared';

const log = logger.child({ service: 'sla-daemon' });

let intervalId: NodeJS.Timeout | null = null;

const SEVERITY_ORDER: Severity[] = ['P4', 'P3', 'P2', 'P1', 'P0'];

/**
 * Returns true if sev1 is higher priority than sev2 (e.g. P0 > P1)
 */
function isSeverityHigher(sev1: Severity, sev2: Severity): boolean {
  return SEVERITY_ORDER.indexOf(sev1) > SEVERITY_ORDER.indexOf(sev2);
}

/**
 * Parses severity_changed_at from tags list
 */
function getSeverityChangedAt(tags: string[]): Date | null {
  const prefix = 'severity_changed_at:';
  const tag = tags.find((t) => t.startsWith(prefix));
  if (!tag) return null;
  const dateStr = tag.substring(prefix.length);
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Sets/Updates severity_changed_at tag
 */
function updateSeverityChangedTag(tags: string[]): string[] {
  const prefix = 'severity_changed_at:';
  const filtered = tags.filter((t) => !t.startsWith(prefix));
  const newTag = `${prefix}${new Date().toISOString()}`;
  return [...filtered, newTag];
}

/**
 * Runs a single check cycle over all active, open incidents.
 */
export async function runEscalationCycle(): Promise<void> {
  const supabase = getSupabase();
  log.debug('Running SLA escalation check cycle...');

  try {
    // 1. Fetch all open/active incidents
    const { data: incidents, error } = await supabase
      .from('incidents')
      .select('*')
      .in('status', ['open', 'investigating', 'mitigating']);

    if (error) {
      log.error({ error }, 'Failed to fetch active incidents for SLA check');
      return;
    }

    if (!incidents || incidents.length === 0) {
      return;
    }

    const now = new Date();

    for (const inc of incidents) {
      let targetSeverity: Severity = inc.severity as Severity;
      let reason = '';

      // ─── Rule A: Auto-escalation by elapsed time (SLA) ───
      const baseTime = getSeverityChangedAt(inc.tags ?? []) ?? new Date(inc.created_at);
      const elapsedMins = (now.getTime() - baseTime.getTime()) / (1000 * 60);

      if (inc.severity === 'P3' && elapsedMins >= 15) {
        targetSeverity = 'P2';
        reason = `SLA threshold breached (P3 open for ${Math.floor(elapsedMins)}m, limit 15m)`;
      } else if (inc.severity === 'P2' && elapsedMins >= 10) {
        targetSeverity = 'P1';
        reason = `SLA threshold breached (P2 open for ${Math.floor(elapsedMins)}m, limit 10m)`;
      } else if (inc.severity === 'P1' && elapsedMins >= 5) {
        targetSeverity = 'P0';
        reason = `SLA threshold breached (P1 open for ${Math.floor(elapsedMins)}m, limit 5m)`;
      }

      // ─── Rule B: Auto-escalation by scope (Affected Services) ───
      const servicesCount = inc.affected_services?.length ?? 0;
      if (servicesCount >= 5 && isSeverityHigher('P0', targetSeverity)) {
        targetSeverity = 'P0';
        reason = `Critical scope escalation (${servicesCount} services affected, upgrading to P0)`;
      } else if (servicesCount >= 3 && isSeverityHigher('P1', targetSeverity)) {
        targetSeverity = 'P1';
        reason = `Major scope escalation (${servicesCount} services affected, upgrading to P1)`;
      }

      // If we determined that an escalation is required
      if (targetSeverity !== inc.severity) {
        log.info(
          { incidentId: inc.id, oldSeverity: inc.severity, newSeverity: targetSeverity, reason },
          'Escalating incident severity'
        );

        // Fetch the SLA configuration for the organization
        const slaConfig = await getOrgSLAConfig(inc.org_id);
        const newBreachAt = calculateBreachAt(new Date(inc.created_at), targetSeverity, slaConfig);

        // Update tags
        const updatedTags = updateSeverityChangedTag(inc.tags ?? []);

        // Update DB
        const { data: updatedInc, error: updateError } = await supabase
          .from('incidents')
          .update({
            severity: targetSeverity,
            sla_breach_at: newBreachAt.toISOString(),
            tags: updatedTags,
          })
          .eq('id', inc.id)
          .select()
          .single();

        if (updateError || !updatedInc) {
          log.error({ updateError, incidentId: inc.id }, 'Failed to update escalated incident in database');
          continue;
        }

        // Emit severity_changed event
        eventBus.emitEvent('incident.severity_changed', {
          incident: updatedInc as Incident,
          orgId: inc.org_id,
          oldSeverity: inc.severity,
          newSeverity: targetSeverity,
        });

        // Notify Slack
        try {
          const slackChannel = config.slack.channel;
          const slackText = `🚨 *Incident Auto-Escalated*\n*Incident:* <${config.appUrl}/dashboard/incidents/${inc.id}|${inc.title}>\n*Status:* Escalated from *${inc.severity}* to *${targetSeverity}*\n*Reason:* ${reason}`;
          
          await sendSlackMessage(
            slackChannel,
            slackText,
            undefined,
            inc.slack_thread_ts ?? undefined
          );
        } catch (slackErr) {
          log.error({ slackErr, incidentId: inc.id }, 'Failed to post Slack notification for escalation');
        }
      }
    }
  } catch (err) {
    log.error({ err }, 'Error in runEscalationCycle');
  }
}

/**
 * Start the SLA auto-escalation background loop.
 * Runs every 60 seconds.
 */
export function startSLADaemon(intervalMs = 60000): void {
  if (intervalId) {
    log.warn('SLA Daemon is already running.');
    return;
  }

  log.info(`🛡️ Starting SLA Auto-Escalation Daemon (polling every ${intervalMs / 1000}s)`);
  
  // Run immediately on start
  runEscalationCycle().catch((err) => log.error({ err }, 'Initial SLA check run failed'));

  intervalId = setInterval(() => {
    runEscalationCycle().catch((err) => log.error({ err }, 'SLA check cycle run failed'));
  }, intervalMs);
}

/**
 * Stop the SLA auto-escalation daemon.
 */
export function stopSLADaemon(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    log.info('SLA Auto-Escalation Daemon stopped.');
  }
}
