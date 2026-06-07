// ═══════════════════════════════════════════════════════════
// Unified Webhook Router — All source handlers
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { logger } from '../../lib/logger.js';
import { handleUptimeRobotWebhook } from './uptimerobot.js';
import { handleSentryWebhook } from './sentry.js';
import { handleGitHubWebhook } from './github.js';
import { handleAgentWebhook } from './agent.js';
import { handleClerkWebhook } from './clerk.js';
import { handleSlackWebhook } from './slack.js';
import {
  verifySlackSignature,
  verifySentrySignature,
  verifyClerkSignature,
  verifyUptimeRobotSignature,
  verifySentinelAgentSignature,
} from '../../middleware/webhookValidation.js';

const log = logger.child({ route: 'webhooks' });

export function createWebhookRoutes(): Router {
  const router = Router();

  // ─── UNIFIED INGEST ENDPOINT ──────────────────────
  router.post('/ingest', verifySentinelAgentSignature, async (req, res, next) => {
    try {
      const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
      const payload = JSON.parse(rawBody);

      // Detect source from payload shape
      if (payload.type === 'alert' || payload.type === 'heartbeat') {
        return handleAgentWebhook(payload, req, res);
      }

      log.info({ keys: Object.keys(payload) }, 'Received ingest webhook');
      res.json({ status: 'received' });
    } catch (err) { next(err); }
  });

  // ─── SOURCE-SPECIFIC ENDPOINTS ────────────────────
  router.post('/uptimerobot', verifyUptimeRobotSignature, async (req, res, next) => {
    try {
      const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
      await handleUptimeRobotWebhook(JSON.parse(rawBody), req, res);
    } catch (err) { next(err); }
  });

  router.post('/sentry', verifySentrySignature, async (req, res, next) => {
    try {
      const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
      await handleSentryWebhook(JSON.parse(rawBody), req, res);
    } catch (err) { next(err); }
  });

  router.post('/github', async (req, res, next) => {
    try {
      const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
      await handleGitHubWebhook(JSON.parse(rawBody), req, res);
    } catch (err) { next(err); }
  });

  router.post('/clerk', verifyClerkSignature, async (req, res, next) => {
    try {
      const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
      await handleClerkWebhook(rawBody, req, res);
    } catch (err) { next(err); }
  });

  router.post('/slack', verifySlackSignature, async (req, res, next) => {
    try {
      await handleSlackWebhook(req, res);
    } catch (err) { next(err); }
  });

  // ─── HEARTBEAT ENDPOINT ──────────────────────────
  router.post('/heartbeat', verifySentinelAgentSignature, async (req, res, next) => {
    try {
      const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
      const payload = JSON.parse(rawBody);
      await handleAgentWebhook({ ...payload, type: 'heartbeat' }, req, res);
    } catch (err) { next(err); }
  });

  return router;
}
