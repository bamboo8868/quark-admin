import { steamParentalService } from '../services/steamParental.service.js';
import { log } from '../utils/logger.js';

/**
 * Steam Parental (Family View) controller for offline account management.
 *
 * POST /offline/accounts/:id/parental-toggle -> start the async toggle job, returns a jobId
 * GET  /offline/parental-job/:jobId          -> poll status + logs
 */
export const steamParentalController = {
  /**
   * Start an enable/disable parental-control toggle job for one offline account.
   */
  toggle: async (request, reply) => {
    try {
      const { id } = request.params;
      const { jobId } = await steamParentalService.startToggle(id);
      log.info(`[SteamParental] Started toggle job ${jobId} for account ${id}`);
      return { code: 0, message: '任务已开始', data: { jobId } };
    } catch (err) {
      return { code: 10001, message: err.message || '启动任务失败', data: null };
    }
  },

  /**
   * Poll a running/finished job.
   */
  getStatus: async (request, reply) => {
    const { jobId } = request.params;
    const state = steamParentalService.getStatus(jobId);
    if (!state) {
      return { code: 10002, message: '任务不存在或已过期', data: null };
    }
    return { code: 0, message: '操作成功', data: state };
  }
};

export default steamParentalController;
