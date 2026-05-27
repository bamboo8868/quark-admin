import { startEmailExists, stopEmailExists } from '../services/emailSync.exists.js';
import { log } from '../utils/logger.js';

log.info('[emailExistsWorker] Starting email exists worker process...');

startEmailExists().catch(err => {
  log.error(`[emailExistsWorker] Fatal error: ${err.message}`);
});

const shutdown = (signal) => {
  log.info(`[emailExistsWorker] Received ${signal}. Shutting down...`);
  stopEmailExists().then(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));