import * as dotenv from 'dotenv';
import * as os from 'os';

dotenv.config();

export const config = {
  webhookUrl: process.env.SENTINEL_WEBHOOK_URL || 'http://localhost:3001/api/webhooks/ingest',
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  orgId: process.env.ORG_ID || '',
  checkIntervalMs: parseInt(process.env.CHECK_INTERVAL_MS || '10000'),
  baselineWindowHours: parseInt(process.env.BASELINE_WINDOW_HOURS || '24'),
  sigmaThreshold: parseFloat(process.env.SIGMA_THRESHOLD || '3.0'),
  alertCooldownMs: parseInt(process.env.ALERT_COOLDOWN_MS || '600000'),
  batchSize: parseInt(process.env.BATCH_SIZE || '50'),
  batchIntervalMs: parseInt(process.env.BATCH_INTERVAL_MS || '30000'),
  circuitBreakerThreshold: parseInt(process.env.CIRCUIT_BREAKER_THRESHOLD || '3'),
  circuitBreakerTimeoutMs: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT_MS || '60000'),
  heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS || '30000'),
  maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE || '1000'),
  retryMaxAgeMs: parseInt(process.env.RETRY_MAX_AGE_MS || '86400000'),
  disabledCollectors: (process.env.DISABLED_COLLECTORS || '').split(',').map(c => c.trim()).filter(Boolean),
  hostname: process.env.HOSTNAME_OVERRIDE || os.hostname(),
  logLevel: process.env.LOG_LEVEL || 'info',
  dataDir: process.env.DATA_DIR || './.sentinel-agent',
};

// Validate required config
export function validateConfig() {
  if (!config.orgId) {
    console.error('❌ ORG_ID is required in agent environment configuration.');
    process.exit(1);
  }
  if (!config.webhookSecret) {
    console.warn('⚠️ WEBHOOK_SECRET is empty. Signature verification might fail on backend.');
  }
}
