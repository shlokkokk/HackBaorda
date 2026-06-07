// ═══════════════════════════════════════════════════════════
// SLA Constants
// ═══════════════════════════════════════════════════════════

import type { Severity } from '../types/incident';
import type { SLAConfig } from '../types/org';

/** Default SLA response times in minutes per severity */
export const DEFAULT_SLA: SLAConfig = {
  P0: 15,     // 15 minutes
  P1: 60,     // 1 hour
  P2: 240,    // 4 hours
  P3: 1440,   // 24 hours
  P4: 10080,  // 7 days
};

/** SLA warning thresholds — show warning when this % of time remains */
export const SLA_WARNING_THRESHOLD = 0.3; // 30%
/** SLA critical thresholds — red pulse when this % of time remains */
export const SLA_CRITICAL_THRESHOLD = 0.2; // 20%

/** Auto-escalation rules: if SLA at risk, bump severity */
export const AUTO_ESCALATION_RULES: Record<Severity, { target: Severity; after_mins: number } | null> = {
  P0: null, // already highest
  P1: { target: 'P0', after_mins: 5 },
  P2: { target: 'P1', after_mins: 10 },
  P3: { target: 'P2', after_mins: 15 },
  P4: { target: 'P3', after_mins: 30 },
};

/** Format minutes into human-readable duration */
export function formatDuration(minutes: number): string {
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
