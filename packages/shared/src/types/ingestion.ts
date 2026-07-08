// ═══════════════════════════════════════════════════════════
// Ingestion Health Types
// ═══════════════════════════════════════════════════════════

import type { IncidentSource } from './incident';

export type IngestionStatus = 'healthy' | 'stale' | 'down';

export interface IngestionHealth {
  id: string;
  org_id: string;
  source: IncidentSource;
  status: IngestionStatus;
  last_ping_at: string;
  last_incident_at: string | null;
  total_incidents: number;
  created_at: string;
}

export interface Host {
  id: string;
  org_id: string;
  hostname: string;
  host_id: string;
  platform: string;
  arch: string;
  ip_addresses: string[];
  agent_version: string;
  status: 'healthy' | 'degraded' | 'down' | 'stale';
  last_heartbeat_at: string;
  collectors_active: string[];
  collectors_failed: string[];
  baseline_status: 'learning' | 'ready' | 'stale';
  baseline_age_hours: number;
  circuit_breaker: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  discovered_services: { name: string; type: string; healthy: boolean }[];
  created_at: string;
}

/** Staleness thresholds in milliseconds */
export const INGESTION_STALENESS = {
  uptimerobot: 10 * 60 * 1000,    // 10 minutes (monitors every 5 min)
  sentry: 30 * 60 * 1000,         // 30 minutes (errors are sporadic)
  'chronicle-agent': 2 * 60 * 1000, // 2 minutes (heartbeat every 30s)
  slack: Infinity,                  // always "connected" when bot is installed
  manual: Infinity,                 // always available
  github: 60 * 60 * 1000,          // 1 hour
} as const;
