import cron from 'node-cron';
import { getDatabase } from '../config/database.js';
import { log } from '../utils/logger.js';

/**
 * View Count Refresh Cron Job
 *
 * Every 30 minutes, recalculates view_count_24h for all records
 * in the account_access_records table by counting timestamps
 * in the view_times JSON array that fall within the last 24 hours.
 */

let task = null;
let isRunning = false;

/**
 * Recalculate view_count_24h for a single record
 */
function calcViewCount24h(viewTimes) {
  if (!viewTimes) return 0;

  let times = [];
  try {
    times = typeof viewTimes === 'string' ? JSON.parse(viewTimes) : viewTimes;
  } catch {
    return 0;
  }

  if (!Array.isArray(times)) return 0;

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return times.filter(t => t >= oneDayAgo).length;
}

/**
 * Run one refresh cycle
 */
async function runRefreshCycle() {
  if (isRunning) {
    log.warn('[viewCountRefresh] Previous cycle still running, skipping...');
    return;
  }

  isRunning = true;
  const db = getDatabase();

  try {
    const records = await db('account_access_records').select('id', 'view_times', 'view_count_24h');
    let updated = 0;

    for (const record of records) {
      const newCount = calcViewCount24h(record.view_times);

      if (newCount !== record.view_count_24h) {
        await db('account_access_records')
          .where('id', record.id)
          .update({
            view_count_24h: newCount,
            updated_at: new Date()
          });
        updated++;
      }
    }

    if (updated > 0) {
      log.info(`[viewCountRefresh] Refreshed ${updated}/${records.length} records`);
    }
  } catch (err) {
    log.error('[viewCountRefresh] Error during refresh cycle', err);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the cron job — runs every 30 minutes
 */
export function startViewCountRefresh() {
  if (task) {
    log.warn('[viewCountRefresh] Cron job already running');
    return;
  }
  runRefreshCycle();

  task = cron.schedule('*/30 * * * *', runRefreshCycle, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });

  log.info('[viewCountRefresh] Cron job started — refreshing every 30 minutes');
}

/**
 * Stop the cron job
 */
export function stopViewCountRefresh() {
  if (task) {
    task.stop();
    task = null;
    log.info('[viewCountRefresh] Cron job stopped');
  }
}
