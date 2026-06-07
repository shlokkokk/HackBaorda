// ═══════════════════════════════════════════════════════════
// Organization Types
// ═══════════════════════════════════════════════════════════

import type { Severity } from './incident';

export interface SLAConfig {
  P0: number; // minutes
  P1: number;
  P2: number;
  P3: number;
  P4: number;
}

export const DEFAULT_SLA_CONFIG: SLAConfig = {
  P0: 15,
  P1: 60,
  P2: 240,
  P3: 1440,
  P4: 10080, // 7 days
};

export interface Org {
  id: string;
  name: string;
  slack_workspace_id: string | null;
  webhook_secret: string;
  sla_config: SLAConfig;
  created_at: string;
}

export interface CreateOrgInput {
  name: string;
  slack_workspace_id?: string;
  sla_config?: Partial<SLAConfig>;
}

export interface UpdateOrgInput {
  name?: string;
  slack_workspace_id?: string;
  sla_config?: Partial<SLAConfig>;
}

/** Calculate SLA breach timestamp from incident creation + severity */
export function calculateSLABreachAt(
  createdAt: Date,
  severity: Severity,
  slaConfig: SLAConfig
): Date {
  const minutes = slaConfig[severity];
  const breachAt = new Date(createdAt.getTime() + minutes * 60 * 1000);
  return breachAt;
}

/** Calculate remaining SLA minutes */
export function calculateSLARemaining(
  breachAt: Date,
  now: Date = new Date()
): number {
  const diff = breachAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60)));
}

/** Get SLA percentage remaining (0-100) */
export function calculateSLAPercentage(
  createdAt: Date,
  breachAt: Date,
  now: Date = new Date()
): number {
  const total = breachAt.getTime() - createdAt.getTime();
  const remaining = breachAt.getTime() - now.getTime();
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (remaining / total) * 100));
}
