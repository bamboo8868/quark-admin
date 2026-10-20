import { steamFamilyService } from '../services/steamFamily.service.js';
import log from '../utils/logger.js';

/**
 * Steam Family Group controller.
 *
 * POST /steam/family/create  -> start the async family-group flow, returns a jobId
 * GET  /steam/family/status/:jobId -> poll status + logs
 */
export const steamFamilyController = {
  /**
   * Start a family-group creation job.
   * Body: {
   *   primary: { username, password, shared_secret, identity_secret },
   *   family:  [{ username, password, shared_secret, identity_secret, type }],
   *   familyName?: string,
   *   proxy?: { protocol, host, port }
   * }
   */
  startCreate: async (request, reply) => {
    try {
      const { jobId } = steamFamilyService.startCreate(request.body || {});
      log.info(`[SteamFamily] Started family-group job ${jobId}`);
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
    const state = steamFamilyService.getStatus(jobId);
    if (!state) {
      return { code: 10002, message: '任务不存在或已过期', data: null };
    }
    return { code: 0, message: '操作成功', data: state };
  }
};

export default steamFamilyController;
