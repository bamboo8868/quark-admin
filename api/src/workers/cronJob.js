import { startViewCountRefresh, stopViewCountRefresh } from '../services/viewCountRefresh.cron.js';
import { log } from '../utils/logger.js';

log.info('[cronJob] Starting view count refresh worker...');

startViewCountRefresh();

const shutdown = (signal) => {
  log.info(`[cronJob] Received ${signal}. Shutting down...`);
  stopViewCountRefresh();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
