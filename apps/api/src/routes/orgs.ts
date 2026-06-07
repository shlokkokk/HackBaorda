// ═══════════════════════════════════════════════════════════
// Org Routes — Organization Management
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { getSupabase } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { CreateOrgSchema } from '@sentinel/shared';
import { initializeIngestionHealth } from '../services/ingestionHealth.js';
import { logger } from '../lib/logger.js';

const log = logger.child({ route: 'orgs' });

export function createOrgRoutes(): Router {
  const router = Router();
  router.use(authMiddleware);

  // ─── GET CURRENT ORG ──────────────────────────────
  router.get('/current', async (req, res, next) => {
    try {
      if (!req.orgId) throw new AppError(404, 'No organization found for user');

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('orgs')
        .select('*')
        .eq('id', req.orgId)
        .single();

      if (error || !data) throw new AppError(404, 'Organization not found');

      res.json({ org: data });
    } catch (err) { next(err); }
  });

  // ─── CREATE ORG ───────────────────────────────────
  router.post('/', async (req, res, next) => {
    try {
      const input = CreateOrgSchema.parse(req.body);
      const supabase = getSupabase();

      const { data: org, error } = await supabase
        .from('orgs')
        .insert({
          name: input.name,
          slack_workspace_id: input.slack_workspace_id ?? null,
          sla_config: input.sla_config ?? undefined,
        })
        .select()
        .single();

      if (error || !org) throw new AppError(500, 'Failed to create organization', error);

      // Link current user to org
      if (req.userId) {
        await supabase
          .from('users')
          .upsert({
            id: req.userId,
            org_id: org.id,
            role: 'admin',
          }, { onConflict: 'id' });
      }

      // Initialize ingestion health entries
      await initializeIngestionHealth(org.id);

      log.info({ orgId: org.id, name: org.name }, 'Organization created');
      res.status(201).json({ org });
    } catch (err) { next(err); }
  });

  // ─── UPDATE ORG ───────────────────────────────────
  router.patch('/:id', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('orgs')
        .update(req.body)
        .eq('id', req.params['id'])
        .select()
        .single();

      if (error || !data) throw new AppError(500, 'Failed to update organization', error);

      res.json({ org: data });
    } catch (err) { next(err); }
  });

  return router;
}
