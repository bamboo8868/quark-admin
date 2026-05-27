import Redis from 'ioredis';
import { config } from './env.js';
import { log } from '../utils/logger.js';

/**
 * Redis connection instance with keep-alive and auto-reconnect
 */
let redis = null;

/**
 * Create a new Redis instance with connection resilience
 */
function createRedisInstance() {
  const instance = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    db: config.redis.db,

    // ==================== Reconnect Strategy ====================
    // ioredis auto-reconnects by default. This controls the delay.
    retryStrategy(times) {
      // Stop retrying after 20 attempts
      if (times > 20) {
        log.error('[Redis] Max retry attempts reached. Giving up.');
        return null; // stop retrying
      }
      // Exponential backoff: 200ms, 400ms, 800ms... max 10s
      const delay = Math.min(times * 200, 10000);
      log.info(`[Redis] Reconnecting in ${delay}ms (attempt ${times})...`);
      return delay;
    },

    // ==================== Keep-Alive ====================
    // Enable TCP keep-alive on the socket
    // Sends ACK packets every 30s to detect dead connections
    keepAlive: 30000,

    // ==================== Timeouts ====================
    // How long to wait for a connection to be established
    connectTimeout: 10000,
    // How long to wait before considering a command as failed
    commandTimeout: 5000,
    // Max retries per command (null = keep retrying until reconnect)
    maxRetriesPerRequest: 3,

    // ==================== Connection ====================
    // Reconnect on error (default: true)
    reconnectOnError: true,
    // Use auto-resubscribe to restore subscriptions after reconnect
    autoResubscribe: true,
    // Resend unfinished commands after reconnect
    autoResendUnfulfilledCommands: true,

    // ==================== Offline Queue ====================
    // Queue commands while disconnected, execute after reconnect
    enableOfflineQueue: true,
    // Max queue size — reject commands if queue exceeds this
    maxOfflineQueueSize: 1000
  });

  // ==================== Event Handlers ====================
  instance.on('connect', () => {
    log.info('[Redis] Connected successfully');
  });

  instance.on('ready', () => {
    log.info('[Redis] Ready to accept commands');
  });

  instance.on('reconnecting', () => {
    log.info('[Redis] Reconnecting...');
  });

  instance.on('error', (error) => {
    log.error(`[Redis] Error: ${error.message}`);
  });

  instance.on('close', () => {
    log.info('[Redis] Connection closed');
  });

  instance.on('end', () => {
    log.warn('[Redis] Connection ended (no more reconnections)');
  });

  // Monitor node status changes for cluster/sentinel scenarios
  instance.on('node error', (error, node) => {
    log.error(`[Redis] Node ${node} error: ${error.message}`);
  });

  return instance;
}

/**
 * Get Redis instance (singleton)
 */
export function getRedis() {
  if (!redis) {
    redis = createRedisInstance();
  }

  return redis;
}

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
    log.info('[Redis] Connection closed gracefully');
  }
}

/**
 * Redis cache helper functions
 */
export const redisCache = {
  /**
   * Get value from cache
   */
  async get(key) {
    const client = getRedis();
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  },

  /**
   * Set value in cache
   */
  async set(key, value, ttlSeconds = 3600) {
    const client = getRedis();
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  },

  /**
   * Delete value from cache
   */
  async del(key) {
    const client = getRedis();
    await client.del(key);
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    const client = getRedis();
    const result = await client.exists(key);
    return result === 1;
  },

  /**
   * Set expiration for a key
   */
  async expire(key, seconds) {
    const client = getRedis();
    await client.expire(key, seconds);
  },

  /**
   * Get TTL for a key
   */
  async ttl(key) {
    const client = getRedis();
    return await client.ttl(key);
  },

  /**
   * Clear all cache (use with caution)
   */
  async flush() {
    const client = getRedis();
    await client.flushdb();
  }
};

export default getRedis;
