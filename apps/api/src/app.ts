// ═══════════════════════════════════════════════════════════
// Express App Factory — All middleware wired
// ═══════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './lib/config.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createIncidentRoutes } from './routes/incidents.js';
import { createWebhookRoutes } from './routes/webhooks/router.js';
import { createOrgRoutes } from './routes/orgs.js';
import { createUserRoutes } from './routes/users.js';
import { createAgentRoutes } from './routes/agent.js';
import { createIngestionRoutes } from './routes/ingestion.js';
import { createAnalyticsRoutes } from './routes/analytics.js';
import { createRunbookRoutes } from './routes/runbooks.js';
import { createPostmortemRoutes } from './routes/postmortems.js';
import { initializeListeners } from './agent/listeners.js';

export function createApp(): express.Express {
  const app = express();

  // Initialize background event listeners
  initializeListeners();

  // ─── Security ──────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Org-Id'],
  }));

  // ─── Body Parsing ──────────────────────────────────
  // Raw body for webhook signature validation
  app.use('/api/webhooks', express.raw({ type: 'application/json' }));
  // JSON for everything else
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Logging ───────────────────────────────────────
  app.use(requestLogger);

  // ─── Health Check ──────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
    });
  });

  // ─── API Routes ────────────────────────────────────
  app.use('/api/incidents', createIncidentRoutes());
  app.use('/api/orgs', createOrgRoutes());
  app.use('/api/users', createUserRoutes());
  app.use('/api/agent', createAgentRoutes());
  app.use('/api/ingestion', createIngestionRoutes());
  app.use('/api/analytics', createAnalyticsRoutes());
  app.use('/api/runbooks', createRunbookRoutes());
  app.use('/api/postmortems', createPostmortemRoutes());

  // ─── Webhook Routes (separate — raw body) ─────────
  app.use('/api/webhooks', createWebhookRoutes());

  // ─── 404 Handler ───────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested endpoint does not exist',
    });
  });

  // ─── Global Error Handler ─────────────────────────
  app.use(errorHandler);

  return app;
}
