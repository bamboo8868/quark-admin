import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Get environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Base configuration
const baseConfig = {
  client: process.env.DB_CLIENT || 'mysql2',
  connection: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'zshop',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root'
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    max: parseInt(process.env.DB_POOL_MAX || '10', 10)
  },
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './seeds'
  }
};

/**
 * Knex configuration for different environments
 */
const configs = {
  development: {
    ...baseConfig,
    debug: true
  },

  production: {
    ...baseConfig,
    pool: {
      min: 2,
      max: 20
    },
    debug: false
  },

  test: {
    client: 'sqlite3',
    connection: ':memory:',
    useNullAsDefault: true,
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }
};

// Export config for current environment, fallback to development
export default configs[NODE_ENV] || configs.development;
