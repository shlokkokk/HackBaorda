// ═══════════════════════════════════════════════════════════
// Server Entry Point
// ═══════════════════════════════════════════════════════════

import { createApp } from './app.js';
import { config } from './lib/config.js';
import { logger } from './lib/logger.js';
import { startSLADaemon, stopSLADaemon } from './services/slaDaemon.js';

async function main() {
  try {
    const app = createApp();

    app.listen(config.port, () => {
      logger.info({
        port: config.port,
        env: config.nodeEnv,
        cors: config.cors.origins,
      }, `🛡️  Chronicle API running on port ${config.port}`);

      // Start the background SLA auto-escalation daemon
      startSLADaemon();
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      stopSLADaemon();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Unhandled errors
    process.on('unhandledRejection', (reason) => {
      logger.error({ err: reason }, 'Unhandled Promise Rejection');
    });

    process.on('uncaughtException', (err) => {
      logger.fatal({ err }, 'Uncaught Exception — shutting down');
      process.exit(1);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

main();
