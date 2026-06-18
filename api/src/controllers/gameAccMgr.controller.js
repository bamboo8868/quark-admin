import { gameAccountService } from '../services/gameAccount.service.js';
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
  }
};
