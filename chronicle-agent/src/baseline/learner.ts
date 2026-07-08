import * as fs from 'fs';
import * as path from 'path';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

interface MetricBaseline {
  mean: number;
  variance: number;
  count: number;
}

export class BaselineLearner {
  private fileDir: string;
  private filePath: string;
  // Key format: "metric_name:hour" -> { mean, variance, count }
  private baselines: Record<string, MetricBaseline> = {};
  private alpha = 0.05; // Smoothing factor (EWMA weight)

  constructor() {
    this.fileDir = path.resolve(config.dataDir);
    this.filePath = path.join(this.fileDir, 'baselines.json');
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(this.fileDir)) {
        fs.mkdirSync(this.fileDir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf8');
        this.baselines = JSON.parse(content);
        logger.info('Loaded baseline learners from local storage', { count: Object.keys(this.baselines).length });
      } else {
        logger.info('No existing baselines file. Initiating fresh learning baseline.');
      }
    } catch (err) {
      logger.error('Failed to load local baseline learner storage. Rebuilding from scratch.', err);
      this.baselines = {};
    }
  }

  private save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.baselines, null, 2), 'utf8');
    } catch (err) {
      logger.error('Failed to save baseline metrics to local storage.', err);
    }
  }

  /**
   * Updates baseline for a metric using EWMA.
   * Partitions by current hour for seasonal time-of-day patterns.
   */
  public update(metricName: string, value: number) {
    const hour = new Date().getHours();
    const key = `${metricName}:${hour}`;

    if (!this.baselines[key]) {
      this.baselines[key] = { mean: value, variance: 0, count: 1 };
    } else {
      const b = this.baselines[key]!;
      b.count += 1;

      // EWMA Update Formula
      const diff = value - b.mean;
      b.mean = this.alpha * value + (1 - this.alpha) * b.mean;
      b.variance = this.alpha * Math.pow(diff, 2) + (1 - this.alpha) * b.variance;
    }

    this.save();
  }

  /**
   * Retrieves baseline statistics. Returns null if count is less than 12 (approx. 2 hours of data).
   */
  public get(metricName: string): { mean: number; stddev: number; count: number } | null {
    const hour = new Date().getHours();
    const key = `${metricName}:${hour}`;
    const b = this.baselines[key];

    // Fallback if we don't have enough observations for this hour
    if (!b || b.count < 12) {
      return null;
    }

    const stddev = Math.sqrt(b.variance);
    return { mean: b.mean, stddev: Math.max(stddev, 0.0001), count: b.count };
  }

  public getAgeHours(): number {
    // Estimate baseline age based on total samples / 360 (10s intervals = 360 samples/hour)
    const keys = Object.keys(this.baselines);
    if (keys.length === 0) return 0;
    const totalSamples = keys.reduce((sum, k) => sum + (this.baselines[k]?.count || 0), 0);
    return totalSamples / (360 * keys.length);
  }
}
