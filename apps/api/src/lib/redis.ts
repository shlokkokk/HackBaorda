// ═══════════════════════════════════════════════════════════
// Upstash Redis Client
// ═══════════════════════════════════════════════════════════

import { Redis } from '@upstash/redis';
import { config } from './config.js';
import { logger } from './logger.js';

let redisInstance: Redis | null = null;

export function getRedis(): Redis | null {
  if (!config.redis.url || !config.redis.token) {
    logger.warn('Redis not configured — rate limiting and caching disabled');
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis({
      url: config.redis.url,
      token: config.redis.token,
    });
    logger.info('Upstash Redis client initialized');
  }
  return redisInstance;
}
