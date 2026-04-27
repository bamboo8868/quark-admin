import { systemRoutes } from './system.routes.js';
import { queryOptimizer, memoryOptimizer } from '../utils/optimizer.js';
import { cache } from '../utils/cache.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

/**
 * Register all routes
 */
export async function registerRoutes(app) {
  // Health check endpoint
  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API info endpoint
  app.get('/', async (request, reply) => {
    return {
      name: 'Quark Admin API',
      version: '1.0.0'
    };
  });

  // Performance monitoring endpoint (admin only)
  app.get('/metrics', {
    preHandler: [authenticate, authorize(['admin'])]
  }, async (request, reply) => {
    const memory = memoryOptimizer.snapshot();
    const queryStats = queryOptimizer.getStats();
    const cacheStats = await cache.stats();
    
    return {
      success: true,
      data: {
        memory,
        queries: queryStats,
        cache: cacheStats,
        uptime: process.uptime()
      }
    };
  });

  // Register route groups
  await app.register(systemRoutes, { prefix: '/api' });
}

export default registerRoutes;
