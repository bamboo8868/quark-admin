import { qaService } from '../services/config.service.js';

/**
 * Public QA endpoints for the web project (no admin auth required).
 */
export const configQaWebController = {
  // GET /api/web/config/qas?type=offline — enabled QAs of a type, ordered by sort
  getQas: async (request, reply) => {
    const type = (request.query && request.query.type) || 'offline';
    const list = await qaService.getEnabledQas(type);
    return { code: 0, message: '操作成功', data: list };
  }
};
