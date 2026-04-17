import { authRoutes } from './auth.routes.js';
import { userRoutes } from './user.routes.js';
import { mockRoutes } from './mock.routes.js';
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
      name: 'Node.js Fastify MVC API',
      version: '1.0.0',
      documentation: '/documentation'
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
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(mockRoutes, { prefix: '/api' });
}

export default registerRoutes;
