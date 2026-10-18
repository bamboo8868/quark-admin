import { settingService } from '../services/config.service.js';

/**
 * Public config-setting endpoints for the web project (no admin auth required).
 */
export const configPurchaseWebController = {
  // GET /api/web/config/purchase-link — the global purchase link
  getPurchaseLink: async (request, reply) => {
    const link = await settingService.getPurchaseLink();
    return { code: 0, message: '操作成功', data: { purchase_link: link } };
  }
};
