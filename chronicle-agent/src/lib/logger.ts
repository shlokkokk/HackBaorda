import { config } from './config.js';

export const logger = {
  info(msg: string, meta?: Record<string, any>) {
    this.log('info', msg, meta);
  },
  warn(msg: string, meta?: Record<string, any>) {
    this.log('warn', msg, meta);
  },
  error(msg: string, err?: any, meta?: Record<string, any>) {
    this.log('error', msg, { ...meta, error: err?.message || String(err), stack: err?.stack });
  },
  debug(msg: string, meta?: Record<string, any>) {
    if (config.logLevel === 'debug') {
      this.log('debug', msg, meta);
    }
  },
  log(level: string, message: string, meta?: Record<string, any>) {
    const payload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      hostname: config.hostname,
      ...meta,
    };
    console.log(JSON.stringify(payload));
  },
};
