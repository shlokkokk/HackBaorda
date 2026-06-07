// ═══════════════════════════════════════════════════════════
// User Routes — User Management
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { getSupabase } from '../db/client.js';
import { authMiddleware, requireOrg } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export function createUserRoutes(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(requireOrg);

  // ─── LIST USERS IN ORG ────────────────────────────
  router.get('/', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('org_id', req.orgId!)
        .order('created_at', { ascending: true });

      if (error) throw new AppError(500, 'Failed to fetch users', error);
      res.json({ users: data ?? [] });
    } catch (err) { next(err); }
  });

  // ─── GET CURRENT USER ─────────────────────────────
  router.get('/me', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', req.userId!)
        .single();

      if (error || !data) throw new AppError(404, 'User not found');
      res.json({ user: data });
    } catch (err) { next(err); }
  });

  // ─── GET ON-CALL USERS ────────────────────────────
  router.get('/on-call', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('org_id', req.orgId!)
        .eq('on_call', true);

      if (error) throw new AppError(500, 'Failed to fetch on-call users', error);
      res.json({ users: data ?? [] });
    } catch (err) { next(err); }
  });

  // ─── UPDATE USER ──────────────────────────────────
  router.patch('/:id', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .update(req.body)
        .eq('id', req.params['id'])
        .eq('org_id', req.orgId!)
        .select()
        .single();

      if (error || !data) throw new AppError(500, 'Failed to update user', error);
      res.json({ user: data });
    } catch (err) { next(err); }
  });

  return router;
}
