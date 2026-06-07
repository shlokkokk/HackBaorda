import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import type { SystemSnapshot } from '../collectors/index.js';
import type { CircuitBreaker } from '../pipeline/circuitBreaker.js';
import type { RetryQueue } from '../pipeline/retryQueue.js';
import type { BaselineLearner } from '../baseline/learner.js';
import * as crypto from 'crypto';

export class HeartbeatSender {
  private interval: NodeJS.Timeout | null = null;
  private sequenceNumber = 0;

  constructor(
    private circuitBreaker: CircuitBreaker,
    private retryQueue: RetryQueue,
    private baselineLearner: BaselineLearner
  ) {
    this.startHeartbeatLoop();
  }

  private startHeartbeatLoop() {
    this.interval = setInterval(() => {
      this.send();
    }, config.heartbeatIntervalMs);
  }

  public async send(snapshot?: SystemSnapshot) {
    this.sequenceNumber++;
    logger.debug(`Sending heartbeat #${this.sequenceNumber}...`);

    // Prepare default heartbeat values if snapshot is not passed
    const activeCollectors = snapshot?.activeCollectors || ['cpu', 'memory', 'disk', 'network', 'process', 'uptime'];
    const failedCollectors = snapshot?.failedCollectors || [];
    const discoveredServices = snapshot?.services.map(s => ({ name: s.name, type: s.type, healthy: s.healthy })) || [];
    const uptime = snapshot?.uptime || process.uptime();

    const hostId = crypto.createHash('sha256').update(config.hostname).digest('hex');

    const payload = {
      version: '2.0',
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      sequence_number: this.sequenceNumber,
      org_id: config.orgId,
      source: {
        hostname: config.hostname,
        host_id: hostId,
        version: '1.0.0'
      },
      health: {
        status: failedCollectors.length > 0 ? 'degraded' : 'healthy',
        uptime_seconds: Math.floor(uptime),
        collectors: {
          active: activeCollectors,
          failed: failedCollectors,
          disabled: config.disabledCollectors
        },
        baseline_status: this.baselineLearner.getAgeHours() >= 24 ? 'ready' : 'learning',
        baseline_age_hours: this.baselineLearner.getAgeHours(),
        circuit_breaker: this.circuitBreaker.getState(),
        queue_depth: this.retryQueue.getDepth(),
        last_alert_at: new Date().toISOString(),
        discovered_services: discoveredServices
      }
    };

    try {
      const url = config.webhookUrl.replace('/ingest', '/heartbeat');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.webhookSecret}`,
          'X-Webhook-Secret': config.webhookSecret,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }
      logger.debug(`Heartbeat #${this.sequenceNumber} acknowledged.`);
    } catch (err) {
      logger.error('Failed to dispatch heartbeat to Sentinel Server', err);
    }
  }

  public stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
