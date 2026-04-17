import { success, paginated, HttpStatus } from '../utils/response.js';
import { log } from '../utils/logger.js';

/**
 * Base controller with common response methods
 */
export class BaseController {
  constructor(service) {
    this.service = service;
  }

  /**
   * Send success response
   */
  ok(reply, data, message = 'Success', statusCode = HttpStatus.OK) {
    return reply.status(statusCode).send(success(data, message));
  }

  /**
   * Send created response
   */
  created(reply, data, message = 'Created') {
    return reply.status(HttpStatus.CREATED).send(success(data, message));
  }

  /**
   * Send paginated response
   */
  paginated(reply, data, pagination) {
    return reply.status(HttpStatus.OK).send(paginated(data, pagination));
  }

  /**
   * Send no content response
   */
  noContent(reply) {
    return reply.status(HttpStatus.NO_CONTENT).send();
  }

  /**
   * Get pagination options from request query
   */
  getPaginationOptions(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const orderBy = query.sortBy || 'created_at';
    const order = query.sortOrder === 'asc' ? 'asc' : 'desc';

    return { page, limit, orderBy, order };
  }

  /**
   * Get user ID from request
   */
  getUserId(request) {
    return request.user?.id;
  }

  /**
   * Log controller action
   */
  logAction(action, meta = {}) {
    log.info(`Controller action: ${action}`, meta);
  }
}

export default BaseController;
