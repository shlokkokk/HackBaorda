import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import type { SystemSnapshot } from '../collectors/index.js';
import type { BaselineLearner } from '../baseline/learner.js';

export interface Alert {
  id: string;
  timestamp: string;
  fingerprint: string;
  severity: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  severity_reason: string;
  title: string;
  description: string;
  status: 'firing' | 'resolved';
  started_at: string;
  service: string;
  service_type: string;
  metric: {
    name: string;
    value: number;
    unit: string;
    baseline?: {
      mean: number;
      stddev: number;
      sigma: number;
      window_hours: number;
    };
  };
}

export class AlertEngine {
  // Key: fingerprint -> active Alert
  private activeAlerts: Record<string, Alert> = {};
  // Flapping suppression tracking: fingerprint -> timestamps of state changes
  private flapTracker: Record<string, number[]> = {};

  constructor(private baselineLearner: BaselineLearner) {}

  /**
   * Evaluates metrics snapshot against baselines and static thresholds.
   * Returns list of new/updated alerts and resolved alerts.
   */
  public evaluate(snapshot: SystemSnapshot): { alertsToSend: Alert[]; activeAlertCount: number } {
    const alertsToSend: Alert[] = [];
    const currentFingerprints = new Set<string>();

    for (const metric of snapshot.metrics) {
      const baseline = this.baselineLearner.get(metric.name);
      let isAnomaly = false;
      let sigma = 0;
      let severity: Alert['severity'] = 'P3';
      let reason = '';

      if (baseline) {
        // ─── Adaptive baseline evaluation ───
        sigma = Math.abs(metric.value - baseline.mean) / baseline.stddev;
        if (sigma >= config.sigmaThreshold) {
          isAnomaly = true;
          if (sigma >= 5.0) {
            severity = 'P0';
          } else if (sigma >= 4.0) {
            severity = 'P1';
          } else if (sigma >= 3.0) {
            severity = 'P2';
          } else {
            severity = 'P3';
          }
          reason = `${sigma.toFixed(1)} sigma deviation from learned baseline (mean=${baseline.mean.toFixed(2)}, σ=${baseline.stddev.toFixed(2)})`;
        }
        // Always feed value to learner
        this.baselineLearner.update(metric.name, metric.value);
      } else {
        // ─── Static fallback evaluation ───
        if (metric.name === 'cpu.usage_percent') {
          if (metric.value >= 95) {
            isAnomaly = true;
            severity = 'P1';
            reason = `Static threshold breach: CPU usage at ${metric.value.toFixed(1)}% (>=95%)`;
          } else if (metric.value >= 80) {
            isAnomaly = true;
            severity = 'P2';
            reason = `Static threshold breach: CPU usage at ${metric.value.toFixed(1)}% (>=80%)`;
          }
        } else if (metric.name === 'memory.used_percent') {
          if (metric.value >= 95) {
            isAnomaly = true;
            severity = 'P1';
            reason = `Static threshold breach: Memory usage at ${metric.value.toFixed(1)}% (>=95%)`;
          } else if (metric.value >= 85) {
            isAnomaly = true;
            severity = 'P2';
            reason = `Static threshold breach: Memory usage at ${metric.value.toFixed(1)}% (>=85%)`;
          }
        } else if (metric.name === 'disk.used_percent') {
          if (metric.value >= 90) {
            isAnomaly = true;
            severity = 'P2';
            reason = `Static threshold breach: Disk storage usage at ${metric.value.toFixed(1)}% (>=90%)`;
          }
        }
        // Save observed values to begin learning baseline
        this.baselineLearner.update(metric.name, metric.value);
      }

      if (isAnomaly) {
        const fingerprint = `${config.hostname}:${metric.name}:firing`;
        currentFingerprints.add(fingerprint);

        if (this.isFlapping(fingerprint)) {
          logger.warn('Alert flapping detected. Suppressing notification.', { fingerprint });
          continue;
        }

        const existingAlert = this.activeAlerts[fingerprint];
        if (!existingAlert) {
          // New alert trigger
          const newAlert: Alert = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            fingerprint,
            severity,
            severity_reason: reason,
            title: `Anomaly: High ${metric.name} on ${config.hostname}`,
            description: `Metric ${metric.name} has deviated from standard range. Current value: ${metric.value.toFixed(2)}${metric.unit}. Reason: ${reason}`,
            status: 'firing',
            started_at: new Date().toISOString(),
            service: this.inferService(metric.name, snapshot),
            service_type: 'system',
            metric: {
              name: metric.name,
              value: metric.value,
              unit: metric.unit,
              baseline: baseline ? {
                mean: baseline.mean,
                stddev: baseline.stddev,
                sigma,
                window_hours: config.baselineWindowHours,
              } : undefined,
            },
          };
          this.activeAlerts[fingerprint] = newAlert;
          alertsToSend.push(newAlert);
          this.recordStateChange(fingerprint);
          logger.info(`Alert firing: ${newAlert.title}`, { fingerprint, severity });
        }
      }
    }

    // ─── Resolve alerts that are no longer active ───
    for (const fingerprint of Object.keys(this.activeAlerts)) {
      const [host, metricName] = fingerprint.split(':');
      const stillAnomaly = Array.from(currentFingerprints).some(f => f.startsWith(`${host}:${metricName}:`));

      if (!stillAnomaly) {
        const firingAlert = this.activeAlerts[fingerprint]!;
        const resolvedAlert: Alert = {
          ...firingAlert,
          timestamp: new Date().toISOString(),
          status: 'resolved',
          description: `Resolved: ${firingAlert.metric.name} returned to normal levels.`,
        };
        delete this.activeAlerts[fingerprint];
        alertsToSend.push(resolvedAlert);
        this.recordStateChange(fingerprint);
        logger.info(`Alert resolved: ${firingAlert.title}`, { fingerprint });
      }
    }

    return {
      alertsToSend,
      activeAlertCount: Object.keys(this.activeAlerts).length,
    };
  }

  private inferService(metricName: string, snapshot: SystemSnapshot): string {
    if (metricName.startsWith('docker.')) return 'docker-daemon';
    // Match discovered service
    const matching = snapshot.services.find(s => s.type === 'database' || s.type === 'cache');
    return matching?.name || 'system-host';
  }

  private recordStateChange(fingerprint: string) {
    if (!this.flapTracker[fingerprint]) {
      this.flapTracker[fingerprint] = [];
    }
    this.flapTracker[fingerprint]!.push(Date.now());
  }

  private isFlapping(fingerprint: string): boolean {
    const history = this.flapTracker[fingerprint];
    if (!history) return false;

    // Remove entries older than 30 mins (1800000 ms)
    const cutoff = Date.now() - 1800000;
    this.flapTracker[fingerprint] = history.filter(t => t > cutoff);

    // If metric changed states (firing/resolved) more than 5 times in 30 mins
    return this.flapTracker[fingerprint]!.length >= 5;
  }
}
