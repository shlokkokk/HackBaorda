// ═══════════════════════════════════════════════════════════
// Incident Routes — CRUD + State Machine + SLA
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { getSupabase } from '../db/client.js';
import { authMiddleware, requireOrg } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { AppError } from '../middleware/errorHandler.js';
import { CreateIncidentSchema, UpdateIncidentSchema, IncidentFilterSchema, STATUS_TRANSITIONS } from '@chronicle/shared';
import { checkDuplicate, attachFingerprint } from '../services/deduplication.js';
import { calculateBreachAt, getOrgSLAConfig } from '../services/sla.js';
import { recordSourcePing } from '../services/ingestionHealth.js';
import { eventBus } from '../services/events.js';
import { logger } from '../lib/logger.js';
import type { Incident, IncidentStatus } from '@chronicle/shared';

const log = logger.child({ route: 'incidents' });

export function createIncidentRoutes(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(requireOrg);
  router.use(rateLimit);

  // ─── LIST INCIDENTS ────────────────────────────────
  router.get('/', async (req, res, next) => {
    try {
      const filters = IncidentFilterSchema.parse(req.query);
      const supabase = getSupabase();
      const orgId = req.orgId!;

      let query = supabase
        .from('incidents')
        .select('*, users!assignee_id(id, name, email)', { count: 'exact' })
        .eq('org_id', orgId)
        .order(filters.sort_by, { ascending: filters.sort_order === 'asc' })
        .range(
          (filters.page - 1) * filters.limit,
          filters.page * filters.limit - 1
        );

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.severity) query = query.eq('severity', filters.severity);
      if (filters.source) query = query.eq('source', filters.source);
      if (filters.assignee_id) query = query.eq('assignee_id', filters.assignee_id);
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw new AppError(500, 'Failed to fetch incidents', error);

      res.json({
        incidents: data ?? [],
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: count ?? 0,
          totalPages: Math.ceil((count ?? 0) / filters.limit),
        },
      });
    } catch (err) { next(err); }
  });

  // ─── GET SINGLE INCIDENT ──────────────────────────
  router.get('/:id', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('incidents')
        .select('*, users!assignee_id(id, name, email)')
        .eq('id', req.params['id'])
        .eq('org_id', req.orgId!)
        .single();

      if (error || !data) throw new AppError(404, 'Incident not found');

      // Fetch agent interactions
      const { data: interactions } = await supabase
        .from('agent_interactions')
        .select('*')
        .eq('incident_id', data.id)
        .order('created_at', { ascending: true });

      res.json({ incident: data, interactions: interactions ?? [] });
    } catch (err) { next(err); }
  });

  // ─── CREATE INCIDENT ──────────────────────────────
  router.post('/', async (req, res, next) => {
    try {
      const input = CreateIncidentSchema.parse(req.body);
      const orgId = req.orgId!;
      const supabase = getSupabase();

      // Attach fingerprint for deduplication
      const withFingerprint = attachFingerprint(input);

      // Check for duplicates
      const existing = await checkDuplicate(orgId, withFingerprint);
      if (existing) {
        res.status(200).json({
          incident: existing,
          deduplicated: true,
          message: `Merged into existing incident ${existing.id}`,
        });
        return;
      }

      // Calculate SLA breach time
      const slaConfig = await getOrgSLAConfig(orgId);
      const severity = input.severity ?? 'P3';
      const breachAt = calculateBreachAt(new Date(), severity, slaConfig);

      const { data, error } = await supabase
        .from('incidents')
        .insert({
          org_id: orgId,
          title: input.title,
          description: input.description ?? null,
          severity,
          status: 'open',
          affected_services: input.affected_services ?? [],
          tags: input.tags ?? [],
          source: input.source ?? 'manual',
          source_id: input.source_id ?? null,
          fingerprint: withFingerprint.fingerprint ?? null,
          assignee_id: input.assignee_id ?? null,
          sla_breach_at: breachAt.toISOString(),
        })
        .select()
        .single();

      if (error || !data) throw new AppError(500, 'Failed to create incident', error);

      // Record source ping
      await recordSourcePing(orgId, input.source ?? 'manual', true);

      // Emit event for agent auto-trigger
      eventBus.emitEvent('incident.created', {
        incident: data as Incident,
        orgId,
      });

      log.info({ incidentId: data.id, source: input.source }, 'Incident created');
      res.status(201).json({ incident: data, deduplicated: false });
    } catch (err) { next(err); }
  });

  // ─── UPDATE INCIDENT ──────────────────────────────
  router.patch('/:id', async (req, res, next) => {
    try {
      const input = UpdateIncidentSchema.parse(req.body);
      const supabase = getSupabase();
      const orgId = req.orgId!;

      // Fetch current incident for state machine validation
      const { data: current } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', req.params['id'])
        .eq('org_id', orgId)
        .single();

      if (!current) throw new AppError(404, 'Incident not found');

      // Validate status transition
      if (input.status) {
        const currentStatus = current.status as IncidentStatus;
        const allowedTransitions = STATUS_TRANSITIONS[currentStatus];
        if (!allowedTransitions?.includes(input.status)) {
          throw new AppError(400,
            `Cannot transition from '${currentStatus}' to '${input.status}'. Allowed: ${allowedTransitions?.join(', ') ?? 'none'}`
          );
        }
      }

      // Set resolved_at if transitioning to resolved
      const updates: Record<string, unknown> = { ...input };
      if (input.status === 'resolved' && !current.resolved_at) {
        updates['resolved_at'] = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('incidents')
        .update(updates)
        .eq('id', req.params['id'])
        .eq('org_id', orgId)
        .select()
        .single();

      if (error || !data) throw new AppError(500, 'Failed to update incident', error);

      // Emit events based on changes
      if (input.status === 'resolved') {
        eventBus.emitEvent('incident.resolved', { incident: data as Incident, orgId });
      }
      if (input.severity && input.severity !== current.severity) {
        eventBus.emitEvent('incident.severity_changed', {
          incident: data as Incident, orgId,
          oldSeverity: current.severity,
          newSeverity: input.severity,
        });
      }

      eventBus.emitEvent('incident.updated', {
        incident: data as Incident, orgId,
        changes: input as Record<string, unknown>,
      });

      res.json({ incident: data });
    } catch (err) { next(err); }
  });

  // ─── DELETE INCIDENT ──────────────────────────────
  router.delete('/:id', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('incidents')
        .delete()
        .eq('id', req.params['id'])
        .eq('org_id', req.orgId!);

      if (error) throw new AppError(500, 'Failed to delete incident', error);

      res.status(204).send();
    } catch (err) { next(err); }
  });

  return router;
}
