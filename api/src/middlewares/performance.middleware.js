import { log } from '../utils/logger.js';
import { redisCache } from '../config/redis.js';
import crypto from 'crypto';

/**
 * Response compression check - skip compression for small responses
 */
export function shouldCompress(req, reply, payload) {
  // Don't compress small responses
  if (payload && payload.length < 1024) {
    return false;
  }
  return true;
}

/**
 * Cache middleware factory
 */
export function createCacheMiddleware(options = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = null, // Custom key generator
    condition = null // Cache condition function
  } = options;

  return async function cacheMiddleware(request, reply) {
    // Skip cache for non-GET requests
    if (request.method !== 'GET') {
      return;
    }

    // Check custom condition
    if (condition && !condition(request)) {
      return;
    }

    // Generate cache key
    const cacheKey = keyGenerator 
      ? keyGenerator(request)
      : generateCacheKey(request);

    try {
      // Try to get from cache
      const cached = await redisCache.get(cacheKey);
      
      if (cached) {
        // Set cache headers
        reply.header('X-Cache', 'HIT');
        reply.header('X-Cache-Key', cacheKey);
        
        // Send cached response
        return reply.send(cached);
      }

      // Mark as cache miss
      reply.header('X-Cache', 'MISS');
      
      // Store original send
      const originalSend = reply.send.bind(reply);
      
      // Override send to cache response
      reply.send = function(payload) {
        // Only cache successful responses
        if (reply.statusCode >= 200 && reply.statusCode < 300) {
          redisCache.set(cacheKey, payload, ttl).catch(err => {
            log.error('Cache set error', err);
          });
        }
        
        return originalSend(payload);
      };
    } catch (error) {
      log.error('Cache middleware error', error);
    }
  };
}

/**
 * Generate cache key from request
 */
function generateCacheKey(request) {
  const url = request.url;
  const query = JSON.stringify(request.query);
  return `cache:${request.method}:${url}:${crypto.createHash('md5').update(query).digest('hex')}`;
}

/**
 * Clear cache middleware
 */
export function createClearCacheMiddleware(pattern) {
  return async function clearCacheMiddleware(request, reply) {
    // Continue with request
    const originalSend = reply.send.bind(reply);
    
    reply.send = function(payload) {
      // Clear cache on successful modification
      if (reply.statusCode >= 200 && reply.statusCode < 300) {
        clearCachePattern(pattern).catch(err => {
          log.error('Cache clear error', err);
        });
      }
      
      return originalSend(payload);
    };
  };
}

/**
 * Clear cache by pattern
 */
async function clearCachePattern(pattern) {
  const redis = await import('../config/redis.js');
  const client = redis.getRedis();
  
  const keys = await client.keys(`cache:*${pattern}*`);
  if (keys.length > 0) {
    await client.del(...keys);
    log.info(`Cleared ${keys.length} cache entries for pattern: ${pattern}`);
  }
}

/**
 * ETag middleware for conditional requests
 */
export async function etagMiddleware(request, reply) {
  if (request.method !== 'GET') {
    return;
  }

  const originalSend = reply.send.bind(reply);
  
  reply.send = function(payload) {
    // Generate ETag
    const etag = generateETag(payload);
    reply.header('ETag', etag);
    
    // Check If-None-Match
    const ifNoneMatch = request.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === etag) {
      reply.status(304);
      return originalSend();
    }
    
    return originalSend(payload);
  };
}

/**
 * Generate ETag from payload
 */
function generateETag(payload) {
  const hash = crypto.createHash('md5');
  hash.update(typeof payload === 'string' ? payload : JSON.stringify(payload));
  return `"${hash.digest('hex')}"`;
}

/**
 * Request timeout middleware
 */
export function createTimeoutMiddleware(timeoutMs = 30000) {
  return async function timeoutMiddleware(request, reply) {
    const timeout = setTimeout(() => {
      log.warn('Request timeout', { 
        method: request.method, 
        url: request.url,
        timeout: timeoutMs 
      });
      reply.status(504).send({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timeout'
        }
      });
    }, timeoutMs);

    // Clear timeout on response
    reply.then(
      () => clearTimeout(timeout),
      () => clearTimeout(timeout)
    );
  };
}

/**
 * Connection pool monitoring
 */
export async function connectionPoolMonitor(request, reply) {
  const start = Date.now();
  
  reply.then(() => {
    const duration = Date.now() - start;
    
    // Log slow requests
    if (duration > 1000) {
      log.warn('Slow request detected', {
        method: request.method,
        url: request.url,
        duration: `${duration}ms`
      });
    }
  });
}

/**
 * Query optimization - add pagination limits
 */
export function createPaginationLimitMiddleware(maxLimit = 100) {
  return async function paginationLimitMiddleware(request, reply) {
    if (request.query.limit) {
      const limit = parseInt(request.query.limit, 10);
      if (limit > maxLimit) {
        request.query.limit = maxLimit;
      }
    }
  };
}

/**
 * Response time tracking
 */
export async function responseTimeTracker(request, reply) {
  const start = process.hrtime.bigint();
  
  reply.then(() => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    
    // Add response time header
    reply.header('X-Response-Time', `${duration.toFixed(2)}ms`);
    
    // Log slow queries
    if (duration > 1000) {
      log.warn('Slow query detected', {
        method: request.method,
        url: request.url,
        duration: `${duration.toFixed(2)}ms`
      });
    }
  });
}

/**
 * Batch request handler
 */
export function createBatchMiddleware(maxBatchSize = 10) {
  return async function batchMiddleware(request, reply) {
    const { requests } = request.body;
    
    if (!Array.isArray(requests)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_BATCH',
          message: 'Batch requests must be an array'
        }
      });
    }
    
    if (requests.length > maxBatchSize) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'BATCH_TOO_LARGE',
          message: `Maximum batch size is ${maxBatchSize}`
        }
      });
    }
    
    // Process batch in parallel
    const results = await Promise.allSettled(
      requests.map(async (req) => {
        // Execute each request
        // This is a simplified version - in production, you'd route to actual handlers
        return { success: true, data: req };
      })
    );
    
    return reply.send({
      success: true,
      data: results.map((result, index) => ({
        index,
        status: result.status,
        ...(result.status === 'fulfilled' 
          ? { data: result.value } 
          : { error: result.reason.message }
        )
      }))
    });
  };
}

/**
 * Static file caching headers
 */
export function createStaticCacheMiddleware(maxAge = 86400) {
  return async function staticCacheMiddleware(request, reply) {
    reply.header('Cache-Control', `public, max-age=${maxAge}`);
    reply.header('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
  };
}

/**
 * Gzip compression options
 */
export const compressionOptions = {
  global: false, // Don't compress all routes
  threshold: 1024, // Only compress responses > 1KB
  zlib: {
    level: 6, // Balanced compression
    memLevel: 8
  }
};

/**
 * Memory usage monitor
 */
export function memoryUsageMonitor() {
  const usage = process.memoryUsage();
  
  return {
    rss: formatBytes(usage.rss),
    heapTotal: formatBytes(usage.heapTotal),
    heapUsed: formatBytes(usage.heapUsed),
    external: formatBytes(usage.external)
  };
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Database query optimization - N+1 detection
 */
export function createNPlusOneDetector(warningThreshold = 10) {
  const queryCounts = new Map();
  
  return {
    trackQuery(model, operation) {
      const key = `${model}:${operation}`;
      const count = (queryCounts.get(key) || 0) + 1;
      queryCounts.set(key, count);
      
      if (count > warningThreshold) {
        log.warn('Potential N+1 query detected', { model, operation, count });
      }
    },
    
    reset() {
      queryCounts.clear();
    }
  };
}
