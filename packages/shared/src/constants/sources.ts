// ═══════════════════════════════════════════════════════════
// Ingestion Source Constants
// ═══════════════════════════════════════════════════════════

import type { IncidentSource } from '../types/incident';

export interface SourceConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
  isAutomatic: boolean;
  webhookPath: string;
}

export const SOURCE_CONFIG: Record<IncidentSource, SourceConfig> = {
  uptimerobot: {
    label: 'UptimeRobot',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    icon: '🟢',
    description: 'Infrastructure monitoring — HTTP checks every 5 min',
    isAutomatic: true,
    webhookPath: '/api/webhooks/uptimerobot',
  },
  sentry: {
    label: 'Sentry',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: '🐛',
    description: 'Application error monitoring — code exceptions & crashes',
    isAutomatic: true,
    webhookPath: '/api/webhooks/sentry',
  },
  'chronicle-agent': {
    label: 'Chronicle Agent',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    icon: '🛡️',
    description: 'Infrastructure agent — adaptive baseline monitoring',
    isAutomatic: true,
    webhookPath: '/api/webhooks/ingest',
  },
  slack: {
    label: 'Slack',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    icon: '💬',
    description: 'Engineer-reported via /chronicle command',
    isAutomatic: false,
    webhookPath: '/api/slack/commands',
  },
  manual: {
    label: 'Manual',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    icon: '✍️',
    description: 'Created manually via dashboard',
    isAutomatic: false,
    webhookPath: '',
  },
  github: {
    label: 'GitHub',
    color: '#f5f5f5',
    bgColor: 'rgba(245, 245, 245, 0.10)',
    icon: '🐙',
    description: 'GitHub Issues labeled as incidents',
    isAutomatic: true,
    webhookPath: '/api/webhooks/github',
  },
};

export const AUTO_SOURCES: IncidentSource[] = Object.entries(SOURCE_CONFIG)
  .filter(([, config]) => config.isAutomatic)
  .map(([key]) => key as IncidentSource);

export const ALL_SOURCES: IncidentSource[] = Object.keys(SOURCE_CONFIG) as IncidentSource[];
