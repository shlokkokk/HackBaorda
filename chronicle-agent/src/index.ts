import { config, validateConfig } from './lib/config.js';
import { logger } from './lib/logger.js';
import { captureSystemSnapshot } from './collectors/index.js';
import { BaselineLearner } from './baseline/learner.js';
import { AlertEngine } from './engine/alertEngine.js';
import { CircuitBreaker } from './pipeline/circuitBreaker.js';
import { RetryQueue } from './pipeline/retryQueue.js';
import { BatchSender } from './pipeline/batchSender.js';
import { HeartbeatSender } from './health/heartbeat.js';

async function main() {
  validateConfig();
  logger.info('🚀 Starting Chronicle Monitoring Agent...', {
    orgId: config.orgId,
    hostname: config.hostname,
    checkIntervalMs: config.checkIntervalMs,
    webhookUrl: config.webhookUrl,
  });

  const baselineLearner = new BaselineLearner();
  const alertEngine = new AlertEngine(baselineLearner);
  const circuitBreaker = new CircuitBreaker();
  const retryQueue = new RetryQueue();
  const batchSender = new BatchSender(circuitBreaker, retryQueue);
  const heartbeatSender = new HeartbeatSender(circuitBreaker, retryQueue, baselineLearner);

  let isRunning = true;

  // ─── Main Collection Loop ──────────────────────────
  const runInterval = async () => {
    if (!isRunning) return;

    try {
      logger.debug('Running metrics collection check...');
      const snapshot = await captureSystemSnapshot();

      // Evaluate metrics against alert conditions
      const { alertsToSend } = alertEngine.evaluate(snapshot);

      // Route generated alerts to BatchSender
      for (const alert of alertsToSend) {
        batchSender.enqueue(alert);
      }

      // Process any retries if the circuit breaker is closed
      if (circuitBreaker.getState() !== 'OPEN') {
        const ready = retryQueue.getReadyAlerts();
        for (const item of ready) {
          const success = await batchSender.sendSingleAlert(item.alert);
          if (success) {
            retryQueue.markSuccess(item.alert.id);
          } else {
            retryQueue.markFailure(item.alert.id);
          }
        }
      }

      // Periodically trigger heartbeat with system context
      if (Math.random() < 0.1) { // 10% chance per run interval to attach full snapshot to heartbeat
        await heartbeatSender.send(snapshot);
      }

    } catch (err) {
      logger.error('Error in agent collection execution loop', err);
    } finally {
      setTimeout(runInterval, config.checkIntervalMs);
    }
  };

  // Trigger first iteration
  setTimeout(runInterval, 100);

  // ─── Graceful Shutdown ─────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`Shutting down agent due to signal ${signal}...`);
    isRunning = false;

    heartbeatSender.stop();
    batchSender.stop();

    logger.info('Flushing final queued alerts buffer...');
    await batchSender.flush();

    logger.info('Chronicle Agent shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch(err => {
  logger.error('Fatal agent startup failure', err);
  process.exit(1);
});
