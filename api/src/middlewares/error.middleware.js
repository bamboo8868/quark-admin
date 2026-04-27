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
    return reply.status(error.statusCode).send(
      errorResponse(error.message, error.code, error.details)
    );
  }

  // Handle Fastify validation errors
  if (error.validation) {
    return reply.status(HttpStatus.BAD_REQUEST).send(
      errorResponse('Validation failed', 'VALIDATION_ERROR', error.message)
    );
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return reply.status(HttpStatus.UNAUTHORIZED).send(
      errorResponse('Invalid token', 'UNAUTHORIZED')
    );
  }

  if (error.name === 'TokenExpiredError') {
    return reply.status(HttpStatus.UNAUTHORIZED).send(
      errorResponse('Token expired', 'UNAUTHORIZED')
    );
  }

  // Handle database errors
  if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
    return reply.status(HttpStatus.CONFLICT).send(
      errorResponse('Resource already exists', 'CONFLICT')
    );
  }

  if (error.code === 'ER_NO_REFERENCED_ROW' || error.code === '23503') {
    return reply.status(HttpStatus.BAD_REQUEST).send(
      errorResponse('Referenced resource not found', 'VALIDATION_ERROR')
    );
  }

  // Default: internal server error
  const isDev = process.env.NODE_ENV === 'dev';
  
  return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
    errorResponse(
      isDev ? error.message : 'Internal server error',
      'INTERNAL_ERROR',
      isDev ? { stack: error.stack } : null
    )
  );
}

/**
 * Not found handler
 */
export function notFoundHandler(request, reply) {
  return reply.status(HttpStatus.NOT_FOUND).send(
    errorResponse(`Route ${request.method} ${request.url} not found`, 'NOT_FOUND')
  );
}
