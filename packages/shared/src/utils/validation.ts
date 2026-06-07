// ═══════════════════════════════════════════════════════════
// Zod Validation Schemas
// ═══════════════════════════════════════════════════════════

import { z } from 'zod';

export const SeveritySchema = z.enum(['P0', 'P1', 'P2', 'P3', 'P4']);
export const IncidentStatusSchema = z.enum([
  'open', 'investigating', 'mitigating', 'resolved', 'postmortem',
]);
export const IncidentSourceSchema = z.enum([
  'uptimerobot', 'sentry', 'sentinel-agent', 'slack', 'manual', 'github',
]);
export const UserRoleSchema = z.enum(['admin', 'responder', 'viewer']);

export const CreateIncidentSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  severity: SeveritySchema.optional().default('P3'),
  affected_services: z.array(z.string()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  source: IncidentSourceSchema.optional().default('manual'),
  source_id: z.string().optional(),
  fingerprint: z.string().optional(),
  assignee_id: z.string().optional(),
});

export const UpdateIncidentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).optional(),
  severity: SeveritySchema.optional(),
  status: IncidentStatusSchema.optional(),
  affected_services: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  assignee_id: z.string().nullable().optional(),
  root_cause: z.string().max(10000).optional(),
  resolution: z.string().max(10000).optional(),
});

export const CreateOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slack_workspace_id: z.string().optional(),
  sla_config: z.object({
    P0: z.number().positive().optional(),
    P1: z.number().positive().optional(),
    P2: z.number().positive().optional(),
    P3: z.number().positive().optional(),
    P4: z.number().positive().optional(),
  }).optional(),
});

export const AgentQuerySchema = z.object({
  incident_id: z.string().uuid(),
  query: z.string().min(1).max(5000),
  context: z.record(z.unknown()).optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort_by: z.string().optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const IncidentFilterSchema = PaginationSchema.extend({
  status: IncidentStatusSchema.optional(),
  severity: SeveritySchema.optional(),
  source: IncidentSourceSchema.optional(),
  search: z.string().optional(),
  assignee_id: z.string().optional(),
});
