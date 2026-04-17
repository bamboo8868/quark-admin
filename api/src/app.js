import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './config/env.js';
import { log } from './utils/logger.js';
import { globalErrorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { securityHeaders, sanitizeInput, detectThreats, requestId } from './middlewares/security.middleware.js';
import { responseTimeTracker, connectionPoolMonitor } from './middlewares/performance.middleware.js';

/**
 * Create and configure Fastify instance
 */
async function createApp() {
  // Create Fastify instance
  const app = Fastify({
    logger: false, // We'll use our own logger
    trustProxy: true,
    connectionTimeout: 30000,
    keepAliveTimeout: 60000,
    bodyLimit: 10 * 1024 * 1024, // 10MB body limit
    caseSensitive: false,
    requestTimeout: 30000
  });

  // Register plugins
  await registerPlugins(app);

  // Register routes
  const { registerRoutes: routes } = await import('./routes/index.js');
  await routes(app);

  // Register error handlers
  registerErrorHandlers(app);

  return app;
}

/**
 * Register Fastify plugins
 */
async function registerPlugins(app) {
  // CORS - restrict in production
  await app.register(cors, {
    origin: config.app.env === 'prod' 
      ? (process.env.ALLOWED_ORIGINS || '').split(',') 
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id', 'X-API-Key'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86400 // 24 hours
  });

  // Helmet for security headers
  await app.register(helmet, {
    contentSecurityPolicy: config.app.env === 'prod',
    crossOriginEmbedderPolicy: config.app.env === 'prod',
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    xssFilter: true
  });

  // Rate limiting - stricter for auth endpoints
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (request) => request.user?.id || request.ip,
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${context.after}`
      }
    }),
    skipOnError: false
  });
}

/**
 * Register error handlers
 */
function registerErrorHandlers(app) {
  // Global error handler
  app.setErrorHandler(globalErrorHandler);

  // 404 handler
  app.setNotFoundHandler(notFoundHandler);

  // Security and performance hooks
  app.addHook('onRequest', async (request, reply) => {
    await requestId(request, reply);
    await responseTimeTracker(request, reply);
    await connectionPoolMonitor(request, reply);
    log.req(request);
  });
  
  // Pre-validation hook for security checks
  app.addHook('preValidation', async (request, reply) => {
    // Detect threats
    await detectThreats(request, reply);
    
    // Sanitize input
    await sanitizeInput(request, reply);
  });
  
  // Pre-handler hook for security headers
  app.addHook('preHandler', async (request, reply) => {
    await securityHeaders(request, reply);
  });
}

/**
 * Start the server
 */
async function start() {
  try {
    const app = await createApp();

    await app.listen({
      port: config.app.port,
      host: config.app.host
    });

    log.info(`Server is running on http://${config.app.host}:${config.app.port}`);

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      log.info(`Received ${signal}. Starting graceful shutdown...`);
      
      await app.close();
      
      // Close database connection
      const { closeDatabase } = await import('./config/database.js');
      await closeDatabase();
      
      // Close Redis connection
      const { closeRedis } = await import('./config/redis.js');
      await closeRedis();
      
      log.info('Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    log.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the application
start();

export { createApp };
export default createApp;
