// ═══════════════════════════════════════════════════════════
// Request Logger Middleware
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';
import { v4 as uuidv4 } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      orgId?: string;
      userId?: string;
    }
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = uuidv4();
  req.requestId = requestId;

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      orgId: req.orgId,
      userId: req.userId,
    };

    if (res.statusCode >= 400) {
      logger.warn(logData, `${req.method} ${req.path} ${res.statusCode}`);
    } else {
      logger.info(logData, `${req.method} ${req.path} ${res.statusCode}`);
    }
  });

  next();
}
