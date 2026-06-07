// ═══════════════════════════════════════════════════════════
// Auth Middleware — Clerk JWT Verification
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@clerk/backend';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { AppError } from './errorHandler.js';
import { ensureUserProvisioned } from '../services/userBootstrap.js';

/**
 * Verify Clerk JWT and attach user info to request.
 * In development, allows bypass with X-Dev-User-Id header.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    // Dev mode bypass
    if (!config.isProduction && req.headers['x-dev-user-id']) {
      req.userId = req.headers['x-dev-user-id'] as string;
      req.orgId = req.headers['x-org-id'] as string | undefined;
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    // Verify with Clerk
    const verifiedToken = await verifyToken(token, { secretKey: config.clerk.secretKey });

    if (!verifiedToken?.sub) {
      throw new AppError(401, 'Invalid token');
    }

    req.userId = verifiedToken.sub;

    // Auto-provision user + org (Clerk webhooks often don't reach localhost)
    const orgId = await ensureUserProvisioned(verifiedToken.sub);
    req.orgId = orgId;

    // X-Org-Id header overrides for multi-org (advanced)
    if (req.headers['x-org-id']) {
      req.orgId = req.headers['x-org-id'] as string;
    }

    next();
  } catch (err) {
    if (err instanceof AppError) {
      next(err);
    } else {
      logger.error({ err }, 'Auth verification failed');
      next(new AppError(401, 'Authentication failed'));
    }
  }
}

/**
 * Require org_id to be set on the request.
 * Must be used after authMiddleware.
 */
export function requireOrg(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.orgId) {
    return next(new AppError(400, 'Organization ID required. Set X-Org-Id header or ensure user has an org.'));
  }
  next();
}
