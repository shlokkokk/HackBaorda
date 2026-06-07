// ═══════════════════════════════════════════════════════════
// Status Constants & Utilities
// ═══════════════════════════════════════════════════════════

import type { IncidentStatus } from '../types/incident';

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
  icon: string;
  isTerminal: boolean;
}

export const STATUS_CONFIG: Record<IncidentStatus, StatusConfig> = {
  open: {
    label: 'Open',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    textColor: '#fca5a5',
    description: 'Incident reported, awaiting response',
    icon: '🔴',
    isTerminal: false,
  },
  investigating: {
    label: 'Investigating',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    textColor: '#fcd34d',
    description: 'Team is investigating root cause',
    icon: '🔍',
    isTerminal: false,
  },
  mitigating: {
    label: 'Mitigating',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    textColor: '#93c5fd',
    description: 'Fix is being applied',
    icon: '🔧',
    isTerminal: false,
  },
  resolved: {
    label: 'Resolved',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    textColor: '#86efac',
    description: 'Incident resolved, service restored',
    icon: '✅',
    isTerminal: false, // can still generate postmortem
  },
  postmortem: {
    label: 'Postmortem',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    textColor: '#c4b5fd',
    description: 'Postmortem completed, lessons learned',
    icon: '📝',
    isTerminal: true,
  },
};

export const STATUS_ORDER: IncidentStatus[] = [
  'open',
  'investigating',
  'mitigating',
  'resolved',
  'postmortem',
];
