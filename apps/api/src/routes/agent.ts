// ═══════════════════════════════════════════════════════════
// Agent Query Route — Chat with the AI agent per incident
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { getSupabase } from '../db/client.js';
import { authMiddleware, requireOrg } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { AgentQuerySchema } from '@chronicle/shared';
import { runAgent } from '../agent/orchestrator.js';
import type { Incident } from '@chronicle/shared';

export function createAgentRoutes(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(requireOrg);

  // ─── QUERY AGENT ──────────────────────────────────
  router.post('/query', async (req, res, next) => {
    try {
      const input = AgentQuerySchema.parse(req.body);
      const orgId = req.orgId!;
      const supabase = getSupabase();

      // Fetch the incident
      const { data: incident } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', input.incident_id)
        .eq('org_id', orgId)
        .single();

      if (!incident) throw new AppError(404, 'Incident not found');

      const response = await runAgent(incident as Incident, input.query, orgId);

      res.json(response);
    } catch (err) { next(err); }
  });

  // ─── GET AGENT INTERACTIONS FOR INCIDENT ──────────
  router.get('/interactions/:incidentId', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('agent_interactions')
        .select('*')
        .eq('incident_id', req.params['incidentId'])
        .order('created_at', { ascending: true });

      if (error) throw new AppError(500, 'Failed to fetch interactions', error);
      res.json({ interactions: data ?? [] });
    } catch (err) { next(err); }
  });

  // ─── GET MEMORY STATS ─────────────────────────────
  router.get('/memory/stats', async (req, res, next) => {
    try {
      const { getAllMemories } = await import('../services/mem0.js');
      const memories = await getAllMemories(req.orgId!);
      res.json({
        total_memories: memories.length,
        memories: memories.slice(0, 20), // Return latest 20
      });
    } catch (err) { next(err); }
  });

  // ─── GET FLEET HOSTS ──────────────────────────────
  router.get('/hosts', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('hosts')
        .select('*')
        .eq('org_id', req.orgId!)
        .order('last_heartbeat_at', { ascending: false });

      if (error) throw new AppError(500, 'Failed to fetch fleet hosts', error);
      res.json({ hosts: data ?? [] });
    } catch (err) { next(err); }
  });

  return router;
}
