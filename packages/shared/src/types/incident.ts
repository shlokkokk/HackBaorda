// ═══════════════════════════════════════════════════════════
// Incident Types
// ═══════════════════════════════════════════════════════════

export type Severity = 'P0' | 'P1' | 'P2' | 'P3' | 'P4';

export type IncidentStatus =
  | 'open'
  | 'investigating'
  | 'mitigating'
  | 'resolved'
  | 'postmortem';

export type IncidentSource =
  | 'uptimerobot'
  | 'sentry'
  | 'sentinel-agent'
  | 'slack'
  | 'manual'
  | 'github';

export interface Incident {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: IncidentStatus;
  affected_services: string[];
  tags: string[];
  assignee_id: string | null;
  root_cause: string | null;
  resolution: string | null;
  sla_breach_at: string | null;
  created_at: string;
  resolved_at: string | null;
  mem0_memory_ids: string[];
  embedding: number[] | null;
  source: IncidentSource;
  source_id: string | null;
  fingerprint: string | null;
  merged_from: string[];
  slack_thread_ts?: string | null;
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  severity?: Severity;
  affected_services?: string[];
  tags?: string[];
  source?: IncidentSource;
  source_id?: string;
  fingerprint?: string;
  assignee_id?: string;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  severity?: Severity;
  status?: IncidentStatus;
  affected_services?: string[];
  tags?: string[];
  assignee_id?: string;
  root_cause?: string;
  resolution?: string;
}

export interface IncidentWithMeta extends Incident {
  assignee?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  interaction_count?: number;
  sla_remaining_mins?: number | null;
  sla_breached?: boolean;
}

/** Valid status transitions enforced by the state machine */
export const STATUS_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  open: ['investigating', 'mitigating', 'resolved'],
  investigating: ['mitigating', 'resolved'],
  mitigating: ['resolved', 'investigating'],
  resolved: ['postmortem', 'open'], // can reopen
  postmortem: [], // terminal state
};
