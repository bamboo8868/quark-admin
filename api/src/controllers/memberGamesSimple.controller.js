import { memberGamesSimpleService } from '../services/memberGamesSimple.service.js';
import { sdaArchiveService } from '../services/sdaArchive.service.js';
import db from '../utils/db.js';
import log from '../utils/logger.js';

/**
 * Member Games Simple Controller (admin back office CRUD)
 * 会员简易游戏库：针对 member_games_simple 表的增删改查。
 */

/** Pick only the editable columns so stray fields (id/created_at) never reach Knex. */
function pickWritable(body = {}) {
  return {
    game_name: body.game_name ?? '',
    account: body.account ?? '',
    password: body.password ?? '',
    code: body.code ?? '',
    member_level: Number(body.member_level ?? 0),
    status: Number(body.status ?? 1)
  };
}

export const memberGamesSimpleController = {
  /**
   * Get simple games list
   * POST /member-games-simple
   */
  getGames: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;

    const filters = {
      name: body.name,
      member_level: body.member_level,
      status: body.status
    };

    const result = await memberGamesSimpleService.getGames(filters, page, limit);

    return { code: 0, message: '操作成功', data: result };
  },

  /**
   * Get simple game by ID
   * GET /member-games-simple/:id
   */
  getGameById: async (request, reply) => {
    const { id } = request.params;
    const row = await memberGamesSimpleService.getGameById(id);

    if (!row) {
      return { code: 10001, message: '记录不存在', data: null };
    }

    return { code: 0, message: '操作成功', data: row };
  },

  /**
   * Create simple game
   * POST /member-games-simple/create
   */
  createGame: async (request, reply) => {
    const row = await memberGamesSimpleService.createGame(pickWritable(request.body));
    return { code: 0, message: '操作成功', data: row };
  },

  /**
   * Update simple game
   * PUT /member-games-simple/:id
   */
  updateGame: async (request, reply) => {
    const { id } = request.params;
    const row = await memberGamesSimpleService.updateGame(id, pickWritable(request.body));
    return { code: 0, message: '操作成功', data: row };
  },

  /**
   * Delete simple game
   * DELETE /member-games-simple/:id
   */
  deleteGame: async (request, reply) => {
    const { id } = request.params;
    await memberGamesSimpleService.deleteGame(id);
    return { code: 0, message: '操作成功', data: null };
  },

  /**
   * Import SDA/maFile — 与游戏账号 importAccounts 保持一致：
   * 只按 account_name 全局绑定已存在简易游戏行的密钥（code 列），不新增行
   * POST /member-games-simple/import
   */
  importGames: async (request, reply) => {
    try {
      const { items } = request.body || {};

      const data = Array.isArray(items) ? items : (items ? [items] : null);
      if (!data || data.length === 0) return { code: 10001, message: '导入数据不能为空', data: null };

      const validItems = data.filter(item => item.account_name);
      if (validItems.length === 0) return { code: 10003, message: '未找到有效的 account_name 数据', data: null };

      // 归档到总SDA账号管理表（含未匹配账号）
      await sdaArchiveService.saveItems(validItems, 'member_simple');

      let bound = 0;            // 更新的总行数（同一账号可能命中多行）
      let matchedAccounts = 0;  // 命中的账号个数
      let skipped = 0;          // account_name 为空被跳过
      const notFound = [];      // 未匹配到任何简易游戏行的 account_name

      for (const item of validItems) {
        const account = String(item.account_name || '').trim();
        const code = String(item.shared_secret || '').trim();

        if (!account) { skipped++; continue; }

        // 按账号名更新所有已存在的简易游戏行；knex .update() 返回受影响行数
        const affected = await db('member_games_simple')
          .where('account', account)
          .update({ code, updated_at: new Date() });

        if (affected > 0) {
          bound += affected;
          matchedAccounts++;
        } else {
          // 只绑定已存在的账号，未匹配的直接跳过，不新增
          notFound.push(account);
        }
      }

      const notFoundHint = notFound.length
        ? `；未匹配 ${notFound.length} 个${notFound.length <= 5 ? `：${notFound.join(', ')}` : `（前 5 个：${notFound.slice(0, 5).join(', ')}）`}`
        : '';

      log.info(`[MemberGameSimple] SDA import: matched=${matchedAccounts}, bound=${bound}, notFound=${notFound.length}`);

      return {
        code: 0,
        message: `绑定完成：命中 ${matchedAccounts} 个账号，更新 ${bound} 行${notFoundHint}`,
        data: { bound, matchedAccounts, skipped, notFound }
      };
    } catch (err) {
      return { code: 10002, message: err.message || '导入失败', data: null };
    }
  }
};

export default memberGamesSimpleController;
