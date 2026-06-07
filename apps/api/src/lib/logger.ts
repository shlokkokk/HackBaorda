// ═══════════════════════════════════════════════════════════
// Structured Logger — Pino (production-grade, not console.log)
// ═══════════════════════════════════════════════════════════

import pino from 'pino';
import { config } from './config.js';

export const logger = pino({
  level: config.isProduction ? 'info' : 'debug',
  transport: config.isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
  base: {
    service: 'sentinel-api',
    version: '1.0.0',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});

/** Create a child logger with additional context */
export function createLogger(context: Record<string, string>) {
  return logger.child(context);
}
