import { MemberGamesSimpleModel } from '../models/memberGamesSimple.model.js';
import { sdaArchiveService } from './sdaArchive.service.js';

const memberGamesSimpleModel = new MemberGamesSimpleModel();

/**
 * Member Games Simple Service (admin back office CRUD)
 * 会员简易游戏库管理：游戏名称 / 游戏账号 / 密码 / 动态验证码密钥 / 会员等级 / 状态
 * Create/update rely on BaseModel pass-through, so every submitted field persists.
 */
export const memberGamesSimpleService = {
  async getGames(filters, page, limit) {
    return await memberGamesSimpleModel.getAdminList(filters, page, limit);
  },

  async getGameById(id) {
    return await memberGamesSimpleModel.findById(id);
  },

  async createGame(data) {
    // 与游戏账号一致：匹配到总SDA账号表时自动带出密钥（member_games_simple 密钥列为 code）
    if (!data.code) {
      const secret = await sdaArchiveService.getSecretByAccountName(data.account);
      if (secret) data.code = secret;
    }
    return await memberGamesSimpleModel.create(data);
  },

  async updateGame(id, data) {
    return await memberGamesSimpleModel.update(id, data);
  },

  async deleteGame(id) {
    return await memberGamesSimpleModel.delete(id);
  }
};

export default memberGamesSimpleService;
