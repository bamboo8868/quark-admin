import knex from 'knex';
import { config } from './env.js';
import { log } from '../utils/logger.js';

/**
 * Database connection instance with keep-alive and auto-reconnect
 */
let db = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_BASE_DELAY = 2000; // 2s
const KEEPALIVE_INTERVAL = 30000; // 30s
let keepaliveTimer = null;

/**
 * Create a new Knex instance with connection resilience
 */
function createKnexInstance() {
  const instance = knex({
    client: config.database.client,
    connection: {
      host: config.database.connection.host,
      port: config.database.connection.port,
      database: config.database.connection.database,
      user: config.database.connection.user,
      password: config.database.connection.password
    },
    pool: {
      min: config.database.pool.min,
      max: config.database.pool.max,
      // Acquire timeout — how long to wait for a connection from pool
      acquireTimeoutMillis: 30000,
      // Create timeout — how long to wait for new connection creation
      createTimeoutMillis: 30000,
      // Idle timeout — reap connections after 10min idle (MySQL default wait_timeout is 8h)
      idleTimeoutMillis: 600000,
      // Reap interval — check for stale connections every 30s
      reapIntervalMillis: 30000,
      // Propagate create errors so we can handle them
      propagateCreateError: true
    },
    migrations: config.database.migrations,
    seeds: config.database.seeds,
    debug: config.app.env === 'dev',
    log: {
      warn: (msg) => log.warn(msg, { source: 'knex' }),
      error: (msg) => log.error(msg, null, { source: 'knex' }),
      deprecate: (msg) => log.warn(msg, { source: 'knex', type: 'deprecation' }),
      debug: (msg) => log.info(msg.sql || '')
    }
  });

  return instance;
}

/**
 * Start keep-alive ping — periodically sends SELECT 1 to prevent
 * MySQL from closing idle connections (default wait_timeout=8h,
 * but network firewalls may close sooner).
 */
function startKeepalive() {
  stopKeepalive();

  keepaliveTimer = setInterval(async () => {
    try {
      if (db) {
        await db.raw('SELECT 1');
        // Reset reconnect counter on successful ping
        reconnectAttempts = 0;
      }
    } catch (err) {
      log.warn(`[DB Keepalive] Ping failed: ${err.message}`);
      await handleConnectionError(err);
    }
  }, KEEPALIVE_INTERVAL);

  // Don't prevent process exit
  if (keepaliveTimer.unref) {
    keepaliveTimer.unref();
  }
}

/**
 * Stop keep-alive timer
 */
function stopKeepalive() {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
  }
}

/**
 * Handle connection errors — attempt to reconnect
 */
async function handleConnectionError(err) {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log.error(`[DB] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Giving up.`);
    return;
  }

  reconnectAttempts++;
  const delay = Math.min(RECONNECT_BASE_DELAY * reconnectAttempts, 30000); // max 30s
  log.info(`[DB] Reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms...`);

  await new Promise(resolve => setTimeout(resolve, delay));

  try {
    // Destroy old instance
    if (db) {
      try { await db.destroy(); } catch { /* ignore */ }
      db = null;
    }

    // Create new instance
    db = createKnexInstance();
    await db.raw('SELECT 1');
    reconnectAttempts = 0;
    log.info('[DB] Reconnected successfully');
    startKeepalive();
  } catch (reconnectErr) {
    log.error(`[DB] Reconnect failed: ${reconnectErr.message}`);
    // Will retry on next keepalive cycle or next query
  }
}

/**
 * Get database instance (singleton)
 */
export function getDatabase() {
  if (!db) {
    db = createKnexInstance();

    // Test connection
    db.raw('SELECT 1')
      .then(() => {
        log.info('Database connected successfully');
        reconnectAttempts = 0;
        startKeepalive();
      })
      .catch(async (error) => {
        log.error(`Database connection failed: ${error.message}`);
        await handleConnectionError(error);
      });
  }

  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  stopKeepalive();
  if (db) {
    await db.destroy();
    db = null;
    log.info('Database connection closed');
  }
}

/**
 * Run migrations
 */
export async function runMigrations() {
  const database = getDatabase();
  await database.migrate.latest();
  log.info('Migrations completed');
}

/**
 * Rollback migrations
 */
export async function rollbackMigrations() {
  const database = getDatabase();
  await database.migrate.rollback();
  log.info('Migrations rolled back');
}

/**
 * Run seeds
 */
export async function runSeeds() {
  const database = getDatabase();
  await database.seed.run();
  log.info('Seeds completed');
}

export default getDatabase;
