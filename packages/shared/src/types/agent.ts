// ═══════════════════════════════════════════════════════════
// Agent Types — Tools, Interactions, Memory
// ═══════════════════════════════════════════════════════════

export interface AgentInteraction {
  id: string;
  incident_id: string;
  query: string;
  response: string;
  tools_used: string[];
  memories_retrieved: MemoryResult[];
  created_at: string;
}

export interface MemoryResult {
  id: string;
  memory: string;
  score: number; // similarity score 0-1
  metadata: MemoryMetadata;
}

export interface MemoryMetadata {
  incident_id: string;
  title: string;
  affected_services: string[];
  root_cause_category: string;
  root_cause: string;
  symptoms: string[];
  effective_fix: string;
  commands_used: string[];
  time_to_detect_mins: number;
  time_to_resolve_mins: number;
  severity: string;
  sla_breached: boolean;
  tags: string[];
  lessons_learned: string;
  postmortem_id: string | null;
  source: string;
  detection_sources: string[];
}

export interface AgentQueryInput {
  incident_id: string;
  query: string;
  context?: Record<string, unknown>;
}

export interface AgentResponse {
  response: string;
  tools_used: string[];
  memories_retrieved: MemoryResult[];
  suggested_severity: string | null;
  suggested_fix: SuggestedFix | null;
}

export interface SuggestedFix {
  steps: FixStep[];
  confidence: number;
  runbook_id: string | null;
  source_incident_id: string | null;
  mode: 'suggest' | 'auto_available' | 'manual';
}

export interface FixStep {
  order: number;
  description: string;
  command: string | null;
  is_destructive: boolean;
  estimated_duration_mins: number | null;
}

export interface Runbook {
  id: string;
  org_id: string;
  title: string;
  incident_type: string | null;
  steps: FixStep[];
  safe_to_automate: boolean;
  confidence_threshold: number;
  created_at: string;
  embedding: number[] | null;
}

export interface Postmortem {
  id: string;
  incident_id: string;
  org_id: string;
  content: string; // Markdown
  review_status: 'draft' | 'in_review' | 'published';
  created_at: string;
}

/** The 10 agent tool names */
export const AGENT_TOOLS = [
  'search_memory',
  'score_severity',
  'suggest_fix',
  'escalate_incident',
  'generate_postmortem',
  'notify_slack',
  'update_status',
  'write_memory',
  'check_sla',
  'verify_fix',
] as const;

export type AgentToolName = (typeof AGENT_TOOLS)[number];
