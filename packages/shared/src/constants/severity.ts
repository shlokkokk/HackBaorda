// ═══════════════════════════════════════════════════════════
// Severity Constants & Utilities
// ═══════════════════════════════════════════════════════════

import type { Severity } from '../types/incident';

export interface SeverityConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
  icon: string;
  priority: number; // lower = higher priority
}

export const SEVERITY_CONFIG: Record<Severity, SeverityConfig> = {
  P0: {
    label: 'P0 — Critical',
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.15)',
    textColor: '#fca5a5',
    description: 'Total system outage, all users affected',
    icon: '🔴',
    priority: 0,
  },
  P1: {
    label: 'P1 — High',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    textColor: '#fca5a5',
    description: 'Major feature down, many users affected',
    icon: '🟠',
    priority: 1,
  },
  P2: {
    label: 'P2 — Medium',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    textColor: '#fcd34d',
    description: 'Feature degraded, some users affected',
    icon: '🟡',
    priority: 2,
  },
  P3: {
    label: 'P3 — Low',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    textColor: '#93c5fd',
    description: 'Minor issue, workaround available',
    icon: '🔵',
    priority: 3,
  },
  P4: {
    label: 'P4 — Info',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    textColor: '#d1d5db',
    description: 'Cosmetic or informational',
    icon: '⚪',
    priority: 4,
  },
};

export const SEVERITY_ORDER: Severity[] = ['P0', 'P1', 'P2', 'P3', 'P4'];

/** Compare severities: returns negative if a is higher priority */
export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_CONFIG[a].priority - SEVERITY_CONFIG[b].priority;
}

/** Map Sentry level to Chronicle severity */
export function sentryLevelToSeverity(level: string): Severity {
  switch (level) {
    case 'fatal': return 'P0';
    case 'error': return 'P1';
    case 'warning': return 'P2';
    case 'info': return 'P3';
    default: return 'P4';
  }
}

/** Map sigma deviation to severity */
export function sigmaToSeverity(sigma: number): Severity {
  if (sigma >= 4) return 'P0';
  if (sigma >= 3) return 'P1';
  if (sigma >= 2) return 'P2';
  if (sigma >= 1) return 'P3';
  return 'P4';
}
