import { announcementService } from '../services/config.service.js';

/**
 * Public announcement endpoints for the web project (no admin auth required).
 */
export const configAnnouncementWebController = {
  // GET /api/web/config/announcements?type=offline — enabled announcements of a type, ordered by sort
  getAnnouncements: async (request, reply) => {
    const type = (request.query && request.query.type) || 'offline';
    const list = await announcementService.getEnabledAnnouncements(type);
    return { code: 0, message: '操作成功', data: list };
  }
};
