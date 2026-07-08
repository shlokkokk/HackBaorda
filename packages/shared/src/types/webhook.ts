// ═══════════════════════════════════════════════════════════
// Webhook Types — All ingestion source payloads
// ═══════════════════════════════════════════════════════════

import type { IncidentSource } from './incident';

/** Unified normalized incident from any webhook source */
export interface NormalizedWebhookPayload {
  title: string;
  description: string;
  source: IncidentSource;
  source_id: string;
  severity_hint: string | null; // e.g., Sentry level → P mapping
  affected_services: string[];
  tags: string[];
  raw_payload: Record<string, unknown>;
  fingerprint: string;
  timestamp: string;
}

/** UptimeRobot webhook payload */
export interface UptimeRobotPayload {
  monitorID: number;
  monitorURL: string;
  monitorFriendlyName: string;
  alertType: string;
  alertTypeFriendlyName: string;
  alertDetails: string;
  alertDuration: string;
  ssl_expiry_date?: string;
  ssl_days_remaining?: string;
  datetime: string;
}

/** Sentry webhook payload (simplified) */
export interface SentryPayload {
  id: string;
  project: string;
  project_name: string;
  culprit: string;
  message: string;
  url: string;
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
  logger: string;
  event: {
    tags: [string, string][];
    extra: Record<string, unknown>;
  };
}

/** GitHub Issues webhook payload (simplified) */
export interface GitHubIssuePayload {
  action: string;
  issue: {
    id: number;
    number: number;
    title: string;
    body: string;
    labels: { name: string }[];
    html_url: string;
    user: { login: string };
    created_at: string;
  };
  repository: {
    full_name: string;
  };
}

/** Chronicle Agent alert payload v2.0 */
export interface ChronicleAgentAlertPayload {
  version: string;
  type: 'alert' | 'heartbeat';
  id: string;
  timestamp: string;
  correlation_id: string;
  source: {
    type: 'chronicle-agent';
    version: string;
    hostname: string;
    host_id: string;
    platform: string;
    arch: string;
    ip_addresses: string[];
  };
  alert: {
    fingerprint: string;
    severity: string;
    severity_reason: string;
    title: string;
    description: string;
    status: 'firing' | 'resolved';
    started_at: string;
    service: string;
    service_type: string;
  };
  metric: {
    name: string;
    value: number;
    unit: string;
    baseline: {
      mean: number;
      stddev: number;
      sigma: number;
      window_hours: number;
    };
    thresholds: {
      static: Record<string, number>;
      adaptive: Record<string, number>;
    };
  };
  context: {
    related_metrics: { name: string; value: number; sigma: number }[];
    top_processes: { pid: number; name: string; cpu_percent: number; mem_percent: number }[];
    recent_events: { type: string; time: string; detail: string }[];
  };
  org_id: string;
  metadata: Record<string, unknown>;
}

/** Chronicle Agent heartbeat payload */
export interface ChronicleAgentHeartbeatPayload {
  version: string;
  type: 'heartbeat';
  timestamp: string;
  sequence_number: number;
  source: {
    hostname: string;
    host_id: string;
    version: string;
  };
  health: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    uptime_seconds: number;
    collectors: {
      active: string[];
      failed: string[];
      disabled: string[];
    };
    baseline_status: 'learning' | 'ready' | 'stale';
    baseline_age_hours: number;
    circuit_breaker: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    queue_depth: number;
    last_alert_at: string | null;
    discovered_services: {
      name: string;
      type: string;
      healthy: boolean;
    }[];
  };
  org_id: string;
}

/** Slack slash command payload */
export interface SlackCommandPayload {
  command: string;
  text: string;
  user_id: string;
  user_name: string;
  channel_id: string;
  channel_name: string;
  team_id: string;
  response_url: string;
  trigger_id: string;
}
