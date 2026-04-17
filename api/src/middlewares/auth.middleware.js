import { verifyAccessToken } from '../utils/jwt.js';
import { AuthenticationError, ForbiddenError } from './error.middleware.js';
import { getRedis } from '../config/redis.js';

/**
 * Extract token from request headers
 */
function extractToken(request) {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

/**
 * JWT authentication middleware
 */
export async function authenticate(request, reply) {
  const token = extractToken(request);
  
  if (!token) {
    throw new AuthenticationError('Access token required');
  }
  
  try {
    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Check if token is blacklisted in Redis
    const redis = getRedis();
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    
    if (isBlacklisted) {
      throw new AuthenticationError('Token has been revoked');
    }
    
    // Attach user to request
    request.user = {
      id: decoded.userId,
      email: decoded.email,
      ...decoded
    };
    
  } catch (err) {
    if (err instanceof AuthenticationError) {
      throw err;
    }
    throw new AuthenticationError('Invalid or expired token');
  }
}

/**
 * Optional authentication middleware (doesn't throw if no token)
 */
export async function optionalAuth(request, reply) {
  try {
    await authenticate(request, reply);
  } catch (err) {
    // Silently ignore authentication errors for optional auth
    request.user = null;
  }
}

/**
 * Role-based authorization middleware factory
 */
export function authorize(roles = []) {
  return async function(request, reply) {
    // Ensure user is authenticated
    if (!request.user) {
      throw new AuthenticationError('Authentication required');
    }
    
    // If no specific roles required, just being authenticated is enough
    if (roles.length === 0) {
      return;
    }
    
    // Check if user has required role
    const userRole = request.user.role || 'user';
    
    if (!roles.includes(userRole)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

/**
 * Rate limit key generator based on user or IP
 */
export function rateLimitKeyGenerator(request) {
  return request.user ? `rate_limit:user:${request.user.id}` : `rate_limit:ip:${request.ip}`;
}
