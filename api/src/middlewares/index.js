// Error handling
export {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  globalErrorHandler,
  notFoundHandler
} from './error.middleware.js';

// Authentication
export {
  authenticate,
  optionalAuth,
  authorize,
  rateLimitKeyGenerator
} from './auth.middleware.js';

// Security
export {
  securityHeaders,
  sanitizeInput,
  detectThreats,
  createSizeLimitMiddleware,
  createIpWhitelist,
  createIpBlacklist,
  createBruteForceProtection,
  createApiKeyAuth,
  requestId,
  timingAttackPrevention
} from './security.middleware.js';

// Performance
export {
  shouldCompress,
  createCacheMiddleware,
  createClearCacheMiddleware,
  etagMiddleware,
  createTimeoutMiddleware,
  connectionPoolMonitor,
  createPaginationLimitMiddleware,
  responseTimeTracker,
  createBatchMiddleware,
  createStaticCacheMiddleware,
  compressionOptions,
  memoryUsageMonitor,
  createNPlusOneDetector
} from './performance.middleware.js';
