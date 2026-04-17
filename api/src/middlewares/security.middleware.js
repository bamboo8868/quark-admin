import { log } from '../utils/logger.js';
import { ForbiddenError, ValidationError } from './error.middleware.js';

// Suspicious patterns for SQL injection detection
const SQL_INJECTION_PATTERNS = [
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
  /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
  /((\%27)|(\'))union/i,
  /exec(\s|\+)+(s|x)p\w+/i,
  /UNION\s+SELECT/i,
  /INSERT\s+INTO/i,
  /DELETE\s+FROM/i,
  /DROP\s+TABLE/i,
  /ALTER\s+TABLE/i,
  /SCRIPT\s*>/i,
  /javascript:/i,
  /on\w+\s*=/i
];

// XSS patterns
const XSS_PATTERNS = [
  /<script[^>]*>[\s\S]*?<\/script>/i,
  /javascript:/i,
  /on\w+\s*=\s*["']?[^"'>]+["']?/i,
  /<iframe/i,
  /<object/i,
  /<embed/i,
  /data:text\/html/i
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e\//i,
  /..%2f/i,
  /%252e%252e%252f/i
];

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Check for SQL injection attempts
 */
function detectSqlInjection(value) {
  if (typeof value !== 'string') return false;
  
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check for XSS attempts
 */
function detectXss(value) {
  if (typeof value !== 'string') return false;
  
  return XSS_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check for path traversal attempts
 */
function detectPathTraversal(value) {
  if (typeof value !== 'string') return false;
  
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Scan object for security threats
 */
function scanForThreats(obj, threats = []) {
  if (typeof obj === 'string') {
    if (detectSqlInjection(obj)) {
      threats.push({ type: 'SQL_INJECTION', value: obj.substring(0, 50) });
    }
    if (detectXss(obj)) {
      threats.push({ type: 'XSS', value: obj.substring(0, 50) });
    }
    if (detectPathTraversal(obj)) {
      threats.push({ type: 'PATH_TRAVERSAL', value: obj.substring(0, 50) });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach(item => scanForThreats(item, threats));
  } else if (typeof obj === 'object' && obj !== null) {
    for (const value of Object.values(obj)) {
      scanForThreats(value, threats);
    }
  }
  
  return threats;
}

/**
 * Security headers middleware
 */
export async function securityHeaders(request, reply) {
  // HSTS - HTTP Strict Transport Security
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  
  // Prevent MIME type sniffing
  reply.header('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  reply.header('X-XSS-Protection', '1; mode=block');
  
  // Frame options - prevent clickjacking
  reply.header('X-Frame-Options', 'DENY');
  
  // Referrer policy
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  reply.header('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()');
  
  // Content Security Policy
  reply.header('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "media-src 'self'; " +
    "object-src 'none'; " +
    "frame-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );
}

/**
 * Input sanitization middleware
 */
export async function sanitizeInput(request, reply) {
  // Sanitize body
  if (request.body) {
    request.body = sanitizeObject(request.body);
  }
  
  // Sanitize query parameters
  if (request.query) {
    request.query = sanitizeObject(request.query);
  }
  
  // Sanitize params
  if (request.params) {
    request.params = sanitizeObject(request.params);
  }
}

/**
 * Threat detection middleware
 */
export async function detectThreats(request, reply) {
  const threats = [];
  
  // Scan all input sources
  scanForThreats(request.body, threats);
  scanForThreats(request.query, threats);
  scanForThreats(request.params, threats);
  
  if (threats.length > 0) {
    log.warn('Security threat detected', {
      ip: request.ip,
      url: request.url,
      threats: threats.map(t => t.type)
    });
    
    throw new ForbiddenError('Request blocked due to security concerns');
  }
}

/**
 * Request size limit middleware
 */
export function createSizeLimitMiddleware(maxSize = 10 * 1024 * 1024) {
  return async function(request, reply) {
    const contentLength = parseInt(request.headers['content-length'], 10);
    
    if (contentLength && contentLength > maxSize) {
      throw new ValidationError(`Request body too large. Maximum size is ${maxSize} bytes`);
    }
  };
}

/**
 * IP whitelist middleware factory
 */
export function createIpWhitelist(allowedIps = []) {
  const ipSet = new Set(allowedIps);
  
  return async function(request, reply) {
    const clientIp = request.ip;
    
    if (ipSet.size > 0 && !ipSet.has(clientIp)) {
      log.warn('Access denied from unauthorized IP', { ip: clientIp });
      throw new ForbiddenError('Access denied');
    }
  };
}

/**
 * IP blacklist middleware factory
 */
export function createIpBlacklist(blockedIps = []) {
  const ipSet = new Set(blockedIps);
  
  return async function(request, reply) {
    const clientIp = request.ip;
    
    if (ipSet.has(clientIp)) {
      log.warn('Access denied from blocked IP', { ip: clientIp });
      throw new ForbiddenError('Access denied');
    }
  };
}

/**
 * Brute force protection middleware factory
 */
export function createBruteForceProtection(options = {}) {
  const { maxAttempts = 5, windowMs = 15 * 60 * 1000 } = options;
  const attempts = new Map();
  
  return async function(request, reply) {
    const key = `${request.ip}:${request.url}`;
    const now = Date.now();
    
    // Clean old entries
    for (const [k, v] of attempts.entries()) {
      if (now - v.firstAttempt > windowMs) {
        attempts.delete(k);
      }
    }
    
    // Check current attempts
    const attempt = attempts.get(key);
    if (attempt) {
      if (now - attempt.firstAttempt > windowMs) {
        // Reset window
        attempts.set(key, { count: 1, firstAttempt: now });
      } else if (attempt.count >= maxAttempts) {
        log.warn('Brute force attempt detected', { ip: request.ip, url: request.url });
        throw new ForbiddenError('Too many attempts. Please try again later.');
      } else {
        attempt.count++;
      }
    } else {
      attempts.set(key, { count: 1, firstAttempt: now });
    }
    
    // Store attempts on request for response handling
    request.bruteForceKey = key;
  };
}

/**
 * API key authentication middleware factory
 */
export function createApiKeyAuth(validApiKeys = []) {
  const keySet = new Set(validApiKeys);
  
  return async function(request, reply) {
    const apiKey = request.headers['x-api-key'];
    
    if (!apiKey) {
      throw new ValidationError('API key required');
    }
    
    if (!keySet.has(apiKey)) {
      log.warn('Invalid API key used', { ip: request.ip });
      throw new ForbiddenError('Invalid API key');
    }
    
    request.apiKey = apiKey;
  };
}

/**
 * Request ID middleware for tracking
 */
export async function requestId(request, reply) {
  const requestId = request.headers['x-request-id'] || 
    `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  
  request.id = requestId;
  reply.header('X-Request-Id', requestId);
}

/**
 * Timing attack prevention - add random delay
 */
export async function timingAttackPrevention(request, reply) {
  // Add small random delay (1-5ms) to prevent timing attacks
  const delay = Math.floor(Math.random() * 4) + 1;
  await new Promise(resolve => setTimeout(resolve, delay));
}
