import pino from 'pino';
import { config } from '../config/env.js';
import path from 'path';
import fs from 'fs';

const logsDir = path.join(process.cwd(), 'logs');

// Create logs directory if not exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Base logger options
const options = {
  level: config.app.logLevel,
  base: { env: config.app.env }
};

// Dev: console + file | Prod: file only
if (config.app.env === 'dev') {
  options.transport = {
    targets: [
      { target: 'pino/file', options: { destination: path.join(logsDir, 'app.log') } },
      { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss' } }
    ]
  };
} else {
  options.transport = {
    targets: [
      { target: 'pino/file', options: { destination: path.join(logsDir, 'app.log') } },
      { target: 'pino/file', options: { destination: path.join(logsDir, 'error.log'), level: 'error' } }
    ]
  };
}

const logger = pino(options);

// Sensitive fields to mask in logs
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'cookie', 'accessToken', 'refreshToken'];

/**
 * Mask sensitive fields in an object
 */
function maskSensitive(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const masked = { ...obj };
  for (const key of Object.keys(masked)) {
    if (SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f.toLowerCase()))) {
      masked[key] = '***';
    }
  }
  return masked;
}

/**
 * Safely stringify and truncate large values
 */
function safeTruncate(obj, maxDepth = 3) {
  try {
    if (!obj) return obj;
    if (typeof obj !== 'object') return obj;
    const str = JSON.stringify(obj);
    if (str.length > 2048) return str.substring(0, 2048) + '...[truncated]';
    return obj;
  } catch {
    return '[unserializable]';
  }
}

// Logger wrapper
export const log = {
  info: (msg, meta = {}) => logger.info(meta, msg),
  error: (msg, error, meta = {}) => {
    const err = error ? { error: { message: error.message, stack: error.stack } } : {};
    logger.error({ ...meta, ...err }, msg);
  },
  warn: (msg, meta = {}) => logger.warn(meta, msg),
  debug: (msg, meta = {}) => logger.debug(meta, msg),
  req: (request) => {
    const params = {
      query: Object.keys(request.query || {}).length > 0 ? safeTruncate(maskSensitive(request.query)) : undefined,
      body: request.body ? safeTruncate(maskSensitive(request.body)) : undefined,
      params: Object.keys(request.params || {}).length > 0 ? request.params : undefined
    };
    Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

    logger.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      ...(Object.keys(params).length > 0 ? { params } : {})
    }, '==>Request');
  },
  res: (request, reply, duration) => {
    const payload = reply._replyPayload ? safeTruncate(maskSensitive(reply._replyPayload)) : undefined;

    logger.info({
      requestId: request.id,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      ...(payload ? { response: payload } : {})
    }, '==>Response');
  }
};

export default logger;
