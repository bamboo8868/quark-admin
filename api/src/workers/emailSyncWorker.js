import { startEmailSync, stopEmailSync } from '../services/emailSync.cron.js';
import { log } from '../utils/logger.js';

log.info('[emailSyncWorker] Starting email sync worker process...');

startEmailSync();

const shutdown = (signal) => {
  log.info(`[emailSyncWorker] Received ${signal}. Shutting down...`);
  stopEmailSync();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
