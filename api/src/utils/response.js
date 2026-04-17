/**
 * Create success response
 */
export function success(data, message = 'Success', meta = null) {
  const response = {
    success: true,
    data,
    message
  };
  
  if (meta) {
    response.meta = meta;
  }
  
  return response;
}

/**
 * Create error response
 */
export function error(message, code = 'INTERNAL_ERROR', details = null) {
  const response = {
    success: false,
    error: {
      code,
      message
    }
  };
  
  if (details) {
    response.error.details = details;
  }
  
  return response;
}

/**
 * Create paginated response
 */
export function paginated(data, pagination) {
  const { page, limit, total } = pagination;
  const totalPages = Math.ceil(total / limit);
  
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

/**
 * HTTP status codes helper
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
};

/**
 * Common error codes
 */
export const ErrorCode = {
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE'
};
