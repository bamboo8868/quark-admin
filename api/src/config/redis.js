import Redis from 'ioredis';
import { config } from './env.js';

/**
 * Redis connection instance
 */
let redis = null;

/**
 * Get Redis instance (singleton)
 */
export function getRedis() {
  if (!redis) {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    redis.on('error', (error) => {
      console.error('Redis connection error:', error.message);
    });

    redis.on('close', () => {
      console.log('Redis connection closed');
    });
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
    console.log('Redis connection closed');
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
