import { systemRoutes,loginRoutes } from './system.routes.js';
import { emailRoutes } from './email.routes.js';
import { gameAccountRoutes } from './gameAccount.routes.js';
import { accountAccessRecordsRoutes } from './accountAccessRecords.routes.js';
import { gameCategoryRoutes } from './gameCategory.routes.js';
import { gameTagRoutes } from './gameTag.routes.js';
import { gameRoutes } from './game.routes.js';
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
  await app.register(loginRoutes, { prefix: '/api' });
  await app.register(systemRoutes, { prefix: '/api' });
  await app.register(emailRoutes, { prefix: '/api' });
  await app.register(gameAccountRoutes, { prefix: '/api' });
  await app.register(accountAccessRecordsRoutes, { prefix: '/api' });
  await app.register(gameCategoryRoutes, { prefix: '/api' });
  await app.register(gameTagRoutes, { prefix: '/api' });
  await app.register(gameRoutes, { prefix: '/api' });
}

export default registerRoutes;
