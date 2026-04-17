import knex from 'knex';
import { config } from './env.js';

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
      debug: config.app.env === 'dev'
    });

    // Test connection
    db.raw('SELECT 1')
      .then(() => {
        console.log('Database connected successfully');
      })
      .catch((error) => {
        console.error('Database connection failed:', error.message);
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
    console.log('Database connection closed');
  }
}

/**
 * Run migrations
 */
export async function runMigrations() {
  const database = getDatabase();
  await database.migrate.latest();
  console.log('Migrations completed');
}

/**
 * Rollback migrations
 */
export async function rollbackMigrations() {
  const database = getDatabase();
  await database.migrate.rollback();
  console.log('Migrations rolled back');
}

/**
 * Run seeds
 */
export async function runSeeds() {
  const database = getDatabase();
  await database.seed.run();
  console.log('Seeds completed');
}

export default getDatabase;
