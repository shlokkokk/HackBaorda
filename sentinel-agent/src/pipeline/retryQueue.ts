import * as fs from 'fs';
import * as path from 'path';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import type { Alert } from '../engine/alertEngine.js';

interface QueuedAlert {
  alert: Alert;
  attempts: number;
  nextRetryAt: number;
  addedAt: number;
}

export class RetryQueue {
  private fileDir: string;
  private filePath: string;
  private queue: QueuedAlert[] = [];

  constructor() {
    this.fileDir = path.resolve(config.dataDir);
    this.filePath = path.join(this.fileDir, 'retry_queue.json');
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(this.fileDir)) {
        fs.mkdirSync(this.fileDir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf8');
        this.queue = JSON.parse(content);
        logger.info('Loaded retry queue from local storage', { count: this.queue.length });
      }
    } catch (err) {
      logger.error('Failed to load local retry queue. Starting fresh.', err);
      this.queue = [];
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.queue, null, 2), 'utf8');
    } catch (err) {
      logger.error('Failed to save retry queue to disk', err);
    }
  }

  public add(alert: Alert) {
    if (this.queue.length >= config.maxQueueSize) {
      logger.warn('Retry queue size threshold reached. Dropping oldest alert in buffer.', { size: this.queue.length });
      this.queue.shift();
    }

    this.queue.push({
      alert,
      attempts: 0,
      nextRetryAt: Date.now(),
      addedAt: Date.now(),
    });
    this.save();
  }

  public getReadyAlerts(): QueuedAlert[] {
    const now = Date.now();
    return this.queue.filter(item => now >= item.nextRetryAt);
  }

  public markSuccess(alertId: string) {
    this.queue = this.queue.filter(item => item.alert.id !== alertId);
    this.save();
  }

  public markFailure(alertId: string) {
    const item = this.queue.find(i => i.alert.id === alertId);
    if (!item) return;

    item.attempts++;
    const elapsed = Date.now() - item.addedAt;

    if (elapsed > config.retryMaxAgeMs) {
      logger.error(`Alert exceeded max retention time (${config.retryMaxAgeMs / 3600000}h). Evicting from retry queue.`, null, { alertId });
      this.queue = this.queue.filter(i => i.alert.id !== alertId);
    } else {
      // Exponential backoff: 5s, 10s, 20s, 40s, 80s... max 5 mins
      const delay = Math.min(5000 * Math.pow(2, item.attempts), 300000);
      item.nextRetryAt = Date.now() + delay;
      logger.debug(`Alert rescheduled for retry`, { alertId, attempts: item.attempts, nextRetryInMs: delay });
    }

    this.save();
  }

  public getDepth(): number {
    return this.queue.length;
  }
}
