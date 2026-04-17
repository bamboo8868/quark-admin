import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Valid NODE_ENV values
 */
const VALID_ENVIRONMENTS = ['dev', 'prod'];

/**
 * Get environment variable with default value
 */
function getEnv(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value !== undefined ? value : defaultValue;
}

/**
 * Get NODE_ENV with validation
 */
function getNodeEnv() {
  const value = process.env.NODE_ENV;
  
  if (!value) {
    return 'dev';
  }
  
  if (!VALID_ENVIRONMENTS.includes(value)) {
    throw new Error(
      `Invalid NODE_ENV: "${value}". Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`
    );
  }
  
  return value;
}

/**
 * Get numeric environment variable
 */
function getEnvNumber(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value !== undefined ? parseInt(value, 10) : defaultValue;
}

/**
 * Get boolean environment variable
 */
function getEnvBoolean(key, defaultValue) {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Application configuration
 */
export const config = {
  app: {
    env: getNodeEnv(),
    port: getEnvNumber('PORT', 3000),
    host: getEnv('HOST', '0.0.0.0'),
    logLevel: getEnv('LOG_LEVEL', 'info'),
    logPrettyPrint: getEnvBoolean('LOG_PRETTY_PRINT', true)
  },
  
  database: {
    client: getEnv('DB_CLIENT', 'mysql2'),
    connection: {
      host: getEnv('DB_HOST', 'localhost'),
      port: getEnvNumber('DB_PORT', 3306),
      database: getEnv('DB_NAME', 'fastify_mvc'),
      user: getEnv('DB_USER', 'root'),
      password: getEnv('DB_PASSWORD', 'password')
    },
    pool: {
      min: getEnvNumber('DB_POOL_MIN', 2),
      max: getEnvNumber('DB_POOL_MAX', 10)
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },
  
  redis: {
    host: getEnv('REDIS_HOST', 'localhost'),
    port: getEnvNumber('REDIS_PORT', 6379),
    password: getEnv('REDIS_PASSWORD', ''),
    db: getEnvNumber('REDIS_DB', 0)
  },
  
  jwt: {
    secret: getEnv('JWT_SECRET', 'your-super-secret-jwt-key'),
    expiresIn: getEnv('JWT_EXPIRES_IN', '7d'),
    refreshSecret: getEnv('JWT_REFRESH_SECRET', 'your-refresh-secret-key'),
    refreshExpiresIn: getEnv('JWT_REFRESH_EXPIRES_IN', '30d')
  }
};

export default config;
