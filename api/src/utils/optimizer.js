import { log } from './logger.js';

/**
 * Database query optimizer
 */
export class QueryOptimizer {
  constructor() {
    this.slowQueries = [];
    this.queryStats = new Map();
  }

  /**
   * Track query execution time
   */
  trackQuery(sql, duration, rows = 0) {
    const stats = this.queryStats.get(sql) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      maxTime: 0,
      rows: 0
    };

    stats.count++;
    stats.totalTime += duration;
    stats.avgTime = stats.totalTime / stats.count;
    stats.maxTime = Math.max(stats.maxTime, duration);
    stats.rows += rows;

    this.queryStats.set(sql, stats);

    // Log slow queries
    if (duration > 1000) {
      this.slowQueries.push({
        sql: sql.substring(0, 200),
        duration,
        timestamp: new Date()
      });

      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries.shift();
      }

      log.warn('Slow query detected', { sql: sql.substring(0, 100), duration });
    }
  }

  /**
   * Get query statistics
   */
  getStats() {
    const sorted = Array.from(this.queryStats.entries())
      .sort((a, b) => b[1].avgTime - a[1].avgTime)
      .slice(0, 10);

    return {
      topSlowest: sorted.map(([sql, stats]) => ({
        sql: sql.substring(0, 100),
        ...stats
      })),
      slowQueries: this.slowQueries.slice(-10)
    };
  }

  /**
   * Clear statistics
   */
  clear() {
    this.queryStats.clear();
    this.slowQueries = [];
  }
}

/**
 * Connection pool optimizer
 */
export class ConnectionPoolOptimizer {
  constructor(pool) {
    this.pool = pool;
    this.metrics = [];
  }

  /**
   * Collect pool metrics
   */
  async collectMetrics() {
    const metric = {
      timestamp: new Date(),
      used: this.pool.numUsed(),
      free: this.pool.numFree(),
      waiting: this.pool.numWaitingAcquires()
    };

    this.metrics.push(metric);

    // Keep last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    // Alert if pool is exhausted
    if (metric.waiting > 10) {
      log.warn('Connection pool under pressure', metric);
    }

    return metric;
  }

  /**
   * Get pool health
   */
  getHealth() {
    if (this.metrics.length === 0) {
      return { status: 'unknown' };
    }

    const recent = this.metrics.slice(-10);
    const avgWaiting = recent.reduce((sum, m) => sum + m.waiting, 0) / recent.length;

    return {
      status: avgWaiting > 5 ? 'critical' : avgWaiting > 0 ? 'warning' : 'healthy',
      avgWaiting,
      current: this.metrics[this.metrics.length - 1]
    };
  }
}

/**
 * Memory optimizer
 */
export class MemoryOptimizer {
  constructor() {
    this.snapshots = [];
  }

  /**
   * Take memory snapshot
   */
  snapshot() {
    const usage = process.memoryUsage();
    const snapshot = {
      timestamp: new Date(),
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external
    };

    this.snapshots.push(snapshot);

    // Keep last 100 snapshots
    if (this.snapshots.length > 100) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get memory trends
   */
  getTrends() {
    if (this.snapshots.length < 2) {
      return null;
    }

    const first = this.snapshots[0];
    const last = this.snapshots[this.snapshots.length - 1];
    const duration = (last.timestamp - first.timestamp) / 1000; // seconds

    return {
      duration,
      heapGrowth: last.heapUsed - first.heapUsed,
      heapGrowthRate: (last.heapUsed - first.heapUsed) / duration,
      current: last
    };
  }

  /**
   * Suggest garbage collection if needed
   */
  shouldCollectGarbage() {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    const heapTotalMB = usage.heapTotal / 1024 / 1024;
    const usageRatio = heapUsedMB / heapTotalMB;

    return usageRatio > 0.8; // Collect if heap is 80% full
  }

  /**
   * Force garbage collection (if available)
   */
  forceGC() {
    if (global.gc) {
      log.info('Forcing garbage collection');
      global.gc();
      return true;
    }
    return false;
  }
}

/**
 * API response optimizer
 */
export class ResponseOptimizer {
  /**
   * Select fields from object
   */
  static selectFields(obj, fields) {
    if (!obj || !fields || fields.length === 0) {
      return obj;
    }

    const selected = {};
    for (const field of fields) {
      if (obj.hasOwnProperty(field)) {
        selected[field] = obj[field];
      }
    }

    return selected;
  }

  /**
   * Select fields from array
   */
  static selectFieldsArray(arr, fields) {
    if (!arr || !fields) {
      return arr;
    }

    return arr.map(item => this.selectFields(item, fields));
  }

  /**
   * Transform data for API response
   */
  static transform(data, transformer) {
    if (Array.isArray(data)) {
      return data.map(item => transformer(item));
    }
    return transformer(data);
  }

  /**
   * Paginate array
   */
  static paginate(array, page = 1, limit = 10) {
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = array.slice(start, end);

    return {
      data,
      meta: {
        page,
        limit,
        total: array.length,
        totalPages: Math.ceil(array.length / limit),
        hasNext: end < array.length,
        hasPrev: page > 1
      }
    };
  }
}

/**
 * Batch processor for efficient bulk operations
 */
export class BatchProcessor {
  constructor(batchSize = 100) {
    this.batchSize = batchSize;
    this.queue = [];
  }

  /**
   * Add item to batch
   */
  add(item) {
    this.queue.push(item);

    if (this.queue.length >= this.batchSize) {
      return this.flush();
    }

    return Promise.resolve([]);
  }

  /**
   * Process all items in queue
   */
  async flush(processor) {
    if (this.queue.length === 0) {
      return [];
    }

    const batch = this.queue.splice(0, this.batchSize);
    const results = await processor(batch);

    return results;
  }
}

// Export singletons
export const queryOptimizer = new QueryOptimizer();
export const memoryOptimizer = new MemoryOptimizer();

// Start memory monitoring
setInterval(() => {
  memoryOptimizer.snapshot();

  if (memoryOptimizer.shouldCollectGarbage()) {
    memoryOptimizer.forceGC();
  }
}, 60000); // Every minute

export default {
  QueryOptimizer,
  ConnectionPoolOptimizer,
  MemoryOptimizer,
  ResponseOptimizer,
  BatchProcessor,
  queryOptimizer,
  memoryOptimizer
};
