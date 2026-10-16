import { carouselService } from '../services/config.service.js';

/**
 * Public carousel endpoints for the web project (no admin auth required).
 */
export const configCarouselWebController = {
  // GET /api/web/config/carousels?type=offline — enabled carousels of a type, ordered by sort
  getCarousels: async (request, reply) => {
    const type = (request.query && request.query.type) || 'offline';
    const list = await carouselService.getEnabledCarousels(type);
    return { code: 0, message: '操作成功', data: list };
  }
};
