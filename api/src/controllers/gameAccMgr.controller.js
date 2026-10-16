import { gameAccountService } from '../services/gameAccount.service.js';
import db from '../utils/db.js';
import log from '../utils/logger.js';

/**
 * Game Account Controller (game_account table)
 */
export const gameAccountController = {
  /**
   * Get game accounts list
   * POST /game-account-mgr
   */
  getAccounts: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;

    const filters = {
      account: body.account,
      game_id: body.game_id,
      status: body.status,
      platform: body.platform
    };

    const result = await gameAccountService.getAccounts(filters, page, limit);

    return {
      code: 0,
      message: '操作成功',
      data: result
    };
  },

  /**
   * Get game account by ID
   * GET /game-account-mgr/:id
   */
  getAccountById: async (request, reply) => {
    const { id } = request.params;
    const account = await gameAccountService.getAccountById(id);

    if (!account) {
      return {
        code: 10001,
        message: '游戏账号不存在',
        data: null
      };
    }

    return {
      code: 0,
      message: '操作成功',
      data: account
    };
  },

  /**
   * Create game account
   * POST /game-account-mgr/create
   */
  createAccount: async (request, reply) => {
    const account = await gameAccountService.createAccount(request.body);
    log.info(`[GameAccount] Created game account: ${account.account}`);

    return {
      code: 0,
      message: '操作成功',
      data: account
    };
  },

  /**
   * Update game account
   * PUT /game-account-mgr/:id
   */
  updateAccount: async (request, reply) => {
    const { id } = request.params;
    const account = await gameAccountService.updateAccount(id, request.body);
    log.info(`[GameAccount] Updated game account ID: ${id}`);

    return {
      code: 0,
      message: '操作成功',
      data: account
    };
  },

  /**
   * Delete game account
   * DELETE /game-account-mgr/:id
   */
  deleteAccount: async (request, reply) => {
    const { id } = request.params;
    await gameAccountService.deleteAccount(id);
    log.info(`[GameAccount] Deleted game account ID: ${id}`);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Batch delete game accounts
   * POST /game-account-mgr/batch-delete
   */
  batchDeleteAccounts: async (request, reply) => {
    const { ids } = request.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return {
        code: 10001,
        message: '请选择要删除的游戏账号',
        data: null
      };
    }

    await gameAccountService.batchDeleteAccounts(ids);
    log.info(`[GameAccount] Batch deleted game accounts: ${ids.join(', ')}`);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Import SDA/maFile — 与租号 importExcel 保持一致：
   * 只按 account_name 全局绑定已存在账号的密钥，不新增行
   * POST /game-account-mgr/import
   */
  importAccounts: async (request, reply) => {
    try {
      const { items } = request.body || {};

      const data = Array.isArray(items) ? items : (items ? [items] : null);
      if (!data || data.length === 0) return { code: 10001, message: '导入数据不能为空', data: null };

      const validItems = data.filter(item => item.account_name);
      if (validItems.length === 0) return { code: 10003, message: '未找到有效的 account_name 数据', data: null };

      let bound = 0;            // 更新的总行数（同一账号跨游戏可能命中多行）
      let matchedAccounts = 0;  // 命中的账号个数
      let skipped = 0;          // account_name 为空被跳过
      const notFound = [];      // 未匹配到任何游戏账号行的 account_name

      for (const item of validItems) {
        const account = String(item.account_name || '').trim();
        const secret = String(item.shared_secret || '').trim();

        if (!account) { skipped++; continue; }

        // 按账号名跨游戏更新所有已存在的游戏账号行；knex .update() 返回受影响行数
        const affected = await db('game_account')
          .where('account', account)
          .update({ secret, updated_at: new Date() });

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

      log.info(`[GameAccount] SDA import: matched=${matchedAccounts}, bound=${bound}, notFound=${notFound.length}`);

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
