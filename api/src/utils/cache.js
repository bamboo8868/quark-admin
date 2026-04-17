import { redisCache } from '../config/redis.js';
import { log } from './logger.js';

/**
 * Cache manager with multiple strategies
 */
export class CacheManager {
  constructor() {
    this.localCache = new Map();
    this.defaultTTL = 300; // 5 minutes
  }

  /**
   * Get value from cache (Redis first, then local)
   */
  async get(key) {
    try {
      // Try Redis first
      const redisValue = await redisCache.get(key);
      if (redisValue !== null) {
        return redisValue;
      }

      // Fall back to local cache
      const localValue = this.localCache.get(key);
      if (localValue && localValue.expiry > Date.now()) {
        return localValue.data;
      }

      // Clean up expired local cache entry
      if (localValue) {
        this.localCache.delete(key);
      }

      return null;
    } catch (error) {
      log.error('Cache get error', error, { key });
      return null;
    }
  }

  /**
   * Set value in cache (both Redis and local)
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      // Set in Redis
      await redisCache.set(key, value, ttl);

      // Set in local cache with shorter TTL
      const localTTL = Math.min(ttl, 60); // Max 1 minute for local cache
      this.localCache.set(key, {
        data: value,
        expiry: Date.now() + (localTTL * 1000)
      });

      return true;
    } catch (error) {
      log.error('Cache set error', error, { key });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    try {
      // Delete from Redis
      await redisCache.del(key);

      // Delete from local cache
      this.localCache.delete(key);

      return true;
    } catch (error) {
      log.error('Cache delete error', error, { key });
      return false;
    }
  }

  /**
   * Get or set cache value
   */
  async remember(key, ttl, callback) {
    const cached = await this.get(key);
    
    if (cached !== null) {
      return cached;
    }

    const value = await callback();
    await this.set(key, value, ttl);
    
    return value;
  }

  /**
   * Get or set cache value forever (no TTL)
   */
  async rememberForever(key, callback) {
    return this.remember(key, 0, callback);
  }

  /**
   * Delete multiple keys by pattern
   */
  async deletePattern(pattern) {
    try {
      const { getRedis } = await import('../config/redis.js');
      const redis = getRedis();
      
      const keys = await redis.keys(`*${pattern}*`);
      
      if (keys.length > 0) {
        await redis.del(...keys);
        
        // Also clear from local cache
        for (const key of keys) {
          this.localCache.delete(key);
        }
      }

      log.info(`Cleared ${keys.length} cache entries for pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      log.error('Cache delete pattern error', error, { pattern });
      return 0;
    }
  }

  /**
   * Clear all cache
   */
  async flush() {
    try {
      // Clear Redis cache
      await redisCache.flush();

      // Clear local cache
      this.localCache.clear();

      log.info('Cache flushed');
      return true;
    } catch (error) {
      log.error('Cache flush error', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async stats() {
    try {
      const { getRedis } = await import('../config/redis.js');
      const redis = getRedis();
      
      const info = await redis.info('memory');
      const keys = await redis.dbsize();

      return {
        redis: {
          keys,
          info: this.parseRedisInfo(info)
        },
        local: {
          keys: this.localCache.size
        }
      };
    } catch (error) {
      log.error('Cache stats error', error);
      return null;
    }
  }

  /**
   * Parse Redis INFO output
   */
  parseRedisInfo(info) {
    const result = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Increment value in cache
   */
  async increment(key, amount = 1) {
    try {
      const { getRedis } = await import('../config/redis.js');
      const redis = getRedis();
      
      const newValue = await redis.incrby(key, amount);
      
      // Update local cache
      this.localCache.delete(key);
      
      return newValue;
    } catch (error) {
      log.error('Cache increment error', error, { key });
      return null;
    }
  }

  /**
   * Decrement value in cache
   */
  async decrement(key, amount = 1) {
    return this.increment(key, -amount);
  }

  /**
   * Set cache with tags for grouped invalidation
   */
  async setWithTags(key, value, tags, ttl = this.defaultTTL) {
    try {
      // Store the value
      await this.set(key, value, ttl);

      // Add key to tag sets
      const { getRedis } = await import('../config/redis.js');
      const redis = getRedis();
      
      for (const tag of tags) {
        await redis.sadd(`cache:tag:${tag}`, key);
      }

      return true;
    } catch (error) {
      log.error('Cache set with tags error', error, { key, tags });
      return false;
    }
  }

  /**
   * Clear cache by tags
   */
  async clearTags(tags) {
    try {
      const { getRedis } = await import('../config/redis.js');
      const redis = getRedis();
      
      let clearedCount = 0;
      
      for (const tag of tags) {
        const keys = await redis.smembers(`cache:tag:${tag}`);
        
        if (keys.length > 0) {
          await redis.del(...keys);
          clearedCount += keys.length;
        }
        
        await redis.del(`cache:tag:${tag}`);
      }

      log.info(`Cleared ${clearedCount} cache entries for tags: ${tags.join(', ')}`);
      return clearedCount;
    } catch (error) {
      log.error('Cache clear tags error', error, { tags });
      return 0;
    }
  }

  /**
   * Clean up expired local cache entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.localCache.entries()) {
      if (value.expiry <= now) {
        this.localCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      log.debug(`Cleaned up ${cleaned} expired local cache entries`);
    }
    
    return cleaned;
  }
}

// Singleton instance
export const cache = new CacheManager();

// Run cleanup every minute
setInterval(() => cache.cleanup(), 60000);

export default cache;
