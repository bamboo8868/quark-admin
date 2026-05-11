import { log } from '../utils/logger.js';
import { error as errorResponse, HttpStatus } from '../utils/response.js';

/**
 * Custom application error
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
  }
}

/**
 * Global error handler
 */
export function globalErrorHandler(error, request, reply) {
  // Log the error
  log.error('Error occurred', error, {
    method: request.method,
    url: request.url,
    ip: request.ip,
    userId: request.user?.id
  });
  // Handle known operational errors
  if (error instanceof AppError) {
    return reply.send(
      { code: 10001, message: error.message, data: null }
    );
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.send(
      { code: 10001, message: 'Validation failed', data: null }
    );
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return reply.send(
      { code: 10001, message: 'Invalid token', data: null }
    );
  }

  if (error.name === 'TokenExpiredError') {
    return reply.send(
      { code: 10001, message: 'Token expired', data: null }
    );
  }

  // Handle database errors
  if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
    return reply.send(
      { code: 10001, message: 'Resource already exists', data: null }
    );
  }

  if (error.code === 'ER_NO_REFERENCED_ROW' || error.code === '23503') {
    return reply.send(
      { code: 10001, message: 'Referenced resource not found', data: null }
    );
  }

  // Default: internal server error
  const isDev = process.env.NODE_ENV === 'dev';
  
  return reply.send(
    { code: 10001, message: isDev ? error.message : 'Internal server error', data: null }
  );
}

/**
 * Not found handler
 */
export function notFoundHandler(request, reply) {
  return reply.send(
    { code: 10001, message: `Route ${request.method} ${request.url} not found`, data: null }
  );
}
