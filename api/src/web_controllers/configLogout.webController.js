import { settingService } from '../services/config.service.js';

/**
 * Config Logout Web Controller - public settings for the offline logout page (no auth required)
 */
export const configLogoutWebController = {
  // GET /api/web/config/logout-setting — logout feature switch + daily limit + cooldown
  getLogoutSetting: async (request, reply) => {
    const [enabled, daily_limit, cooldown_seconds] = await Promise.all([
      settingService.getLogoutEnabled(),
      settingService.getLogoutDailyLimit(),
      settingService.getLogoutCooldownSeconds()
    ]);
    return { code: 0, message: '操作成功', data: { enabled, daily_limit, cooldown_seconds } };
  }
};

export default configLogoutWebController;