// ═══════════════════════════════════════════════════════════
// Postmortem Routes — CRUD + Export
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { getSupabase } from '../db/client.js';
import { authMiddleware, requireOrg } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export function createPostmortemRoutes(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(requireOrg);

  router.get('/', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('postmortems')
        .select('*, incidents(title, severity, source, created_at, resolved_at)')
        .eq('org_id', req.orgId!)
        .order('created_at', { ascending: false });
      if (error) throw new AppError(500, 'Failed to fetch postmortems', error);
      res.json({ postmortems: data ?? [] });
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('postmortems')
        .select('*, incidents(*)')
        .eq('id', req.params['id'])
        .eq('org_id', req.orgId!)
        .single();
      if (error || !data) throw new AppError(404, 'Postmortem not found');
      res.json({ postmortem: data });
    } catch (err) { next(err); }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('postmortems')
        .update(req.body)
        .eq('id', req.params['id'])
        .eq('org_id', req.orgId!)
        .select()
        .single();
      if (error || !data) throw new AppError(500, 'Failed to update postmortem', error);
      res.json({ postmortem: data });
    } catch (err) { next(err); }
  });

  return router;
}
