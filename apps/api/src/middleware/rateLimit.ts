// ═══════════════════════════════════════════════════════════
// Rate Limiting Middleware — Upstash Redis
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { getRedis } from '../lib/redis.js';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

let rateLimiter: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  if (!rateLimiter) {
    rateLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.rateLimit.maxRequests,
        `${config.rateLimit.windowMs}ms` as `${number} ms`
      ),
      analytics: true,
      prefix: 'chronicle:ratelimit',
    });
  }
  return rateLimiter;
}

export async function rateLimit(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const limiter = getRateLimiter();
  if (!limiter) {
    // Redis not configured — skip rate limiting
    return next();
  }

  try {
    const identifier = req.userId ?? req.ip ?? 'anonymous';
    const { success, limit, reset, remaining } = await limiter.limit(identifier);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', reset);

    if (!success) {
      logger.warn({ identifier }, 'Rate limit exceeded');
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please retry later.',
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      });
      return;
    }

    next();
  } catch (err) {
    // If rate limiting fails, let the request through
    logger.error({ err }, 'Rate limiting error — allowing request');
    next();
  }
}
