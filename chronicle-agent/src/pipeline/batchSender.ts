import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import type { Alert } from '../engine/alertEngine.js';
import type { CircuitBreaker } from './circuitBreaker.js';
import type { RetryQueue } from './retryQueue.js';

export class BatchSender {
  private buffer: Alert[] = [];
  private batchInterval: NodeJS.Timeout | null = null;
  private sequenceNumber = 0;

  constructor(
    private circuitBreaker: CircuitBreaker,
    private retryQueue: RetryQueue
  ) {
    this.startBatchLoop();
  }

  private startBatchLoop() {
    this.batchInterval = setInterval(() => {
      this.flush();
    }, config.batchIntervalMs);
  }

  public enqueue(alert: Alert) {
    this.buffer.push(alert);
    if (this.buffer.length >= config.batchSize) {
      logger.info('Batch limit reached. Flushing alerts buffer.', { size: this.buffer.length });
      this.flush();
    }
  }

  public async flush() {
    if (this.buffer.length === 0) return;
    const batch = [...this.buffer];
    this.buffer = [];

    // If circuit breaker is open, immediately queue this batch for retry
    if (!this.circuitBreaker.canRequest()) {
      logger.warn('Circuit Breaker is OPEN. Routing alerts batch directly to local retry queue.');
      for (const alert of batch) {
        this.retryQueue.add(alert);
      }
      return;
    }

    await this.sendBatch(batch);
  }

  public async sendSingleAlert(alert: Alert): Promise<boolean> {
    const correlationId = crypto.randomUUID();
    const payload = {
      version: '2.0',
      type: 'alert',
      id: alert.id,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      org_id: config.orgId,
      source: {
        type: 'chronicle-agent',
        version: '1.0.0',
        hostname: config.hostname,
        host_id: crypto.createHash('sha256').update(config.hostname).digest('hex'),
        platform: process.platform,
        arch: process.arch,
        ip_addresses: []
      },
      alert,
      metric: alert.metric,
      context: {
        related_metrics: [],
        top_processes: [],
        recent_events: []
      }
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.webhookSecret}`,
          'X-Webhook-Secret': config.webhookSecret,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      this.circuitBreaker.recordSuccess();
      return true;
    } catch (err) {
      logger.error('Failed to post alert to Chronicle Webhook', err);
      this.circuitBreaker.recordFailure();
      return false;
    }
  }

  private async sendBatch(alerts: Alert[]) {
    this.sequenceNumber++;
    logger.info(`Sending batch #${this.sequenceNumber} to Chronicle...`, { size: alerts.length });

    // Send alerts in batch or individually (backend expects individual /ingest endpoint alerts)
    // Wait, the backend endpoint handleAgentWebhook accepts one Alert / Heartbeat per request:
    // payload.type === 'alert' or 'heartbeat'
    // So we should POST them individually or batch send them.
    // Let's send them in parallel individually to `/api/webhooks/ingest`.
    let batchSuccess = true;
    for (const alert of alerts) {
      const success = await this.sendSingleAlert(alert);
      if (!success) {
        batchSuccess = false;
        this.retryQueue.add(alert);
      }
    }

    if (batchSuccess) {
      logger.info(`Batch #${this.sequenceNumber} sent successfully.`);
    } else {
      logger.warn(`Batch #${this.sequenceNumber} failed partially/fully. Re-routed failed items to retry queue.`);
    }
  }

  public stop() {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
  }
}

// Import helper
import * as crypto from 'crypto';
