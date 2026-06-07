// ═══════════════════════════════════════════════════════════
// Runbook Routes — CRUD
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { getSupabase } from '../db/client.js';
import { authMiddleware, requireOrg } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export function createRunbookRoutes(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(requireOrg);

  router.get('/', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('runbooks')
        .select('*')
        .eq('org_id', req.orgId!)
        .order('created_at', { ascending: false });
      if (error) throw new AppError(500, 'Failed to fetch runbooks', error);
      res.json({ runbooks: data ?? [] });
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('runbooks')
        .select('*')
        .eq('id', req.params['id'])
        .eq('org_id', req.orgId!)
        .single();
      if (error || !data) throw new AppError(404, 'Runbook not found');
      res.json({ runbook: data });
    } catch (err) { next(err); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('runbooks')
        .insert({ ...req.body, org_id: req.orgId! })
        .select()
        .single();
      if (error || !data) throw new AppError(500, 'Failed to create runbook', error);
      res.status(201).json({ runbook: data });
    } catch (err) { next(err); }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('runbooks')
        .update(req.body)
        .eq('id', req.params['id'])
        .eq('org_id', req.orgId!)
        .select()
        .single();
      if (error || !data) throw new AppError(500, 'Failed to update runbook', error);
      res.json({ runbook: data });
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      await supabase.from('runbooks').delete().eq('id', req.params['id']).eq('org_id', req.orgId!);
      res.status(204).send();
    } catch (err) { next(err); }
  });

  return router;
}
