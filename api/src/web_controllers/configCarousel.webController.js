import { carouselService } from '../services/config.service.js';

/**
 * Public carousel endpoints for the web project (no admin auth required).
 */
export const configCarouselWebController = {
  // GET /api/web/config/carousels — enabled carousels ordered by sort
  getCarousels: async (request, reply) => {
    const list = await carouselService.getEnabledCarousels();
    return { code: 0, message: '操作成功', data: list };
  }
};
