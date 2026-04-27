import knex from 'knex';
import { config } from './env.js';
import { log } from '../utils/logger.js';

/**
 * Database connection instance
 */
let db = null;

/**
 * Get database instance (singleton)
 */
export function getDatabase() {
  if (!db) {
    db = knex({
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
        max: config.database.pool.max
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

    // Test connection
    db.raw('SELECT 1')
      .then(() => {
        log.info('Database connected successfully');
      })
      .catch((error) => {
        log.error('Database connection failed', error);
        throw error;
      });
  }

  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
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
