// ═══════════════════════════════════════════════════════════
// Ingestion Health Routes
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { authMiddleware, requireOrg } from '../middleware/auth.js';
import { getIngestionHealth } from '../services/ingestionHealth.js';

export function createIngestionRoutes(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(requireOrg);

  // ─── GET INGESTION HEALTH ─────────────────────────
  router.get('/health', async (req, res, next) => {
    try {
      const health = await getIngestionHealth(req.orgId!);
      res.json({ sources: health });
    } catch (err) { next(err); }
  });

  return router;
}
