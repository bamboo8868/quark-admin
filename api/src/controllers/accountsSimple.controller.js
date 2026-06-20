import { accountsSimpleService } from '../services/accountsSimple.service.js';

/**
 * Accounts Simple Controller - Game account CRUD operations
 */
export const accountsSimpleController = {
  /**
   * Get accounts list
   * POST /game-accounts
   */
  getAccounts: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;

    const filters = {
      account: body.account,
      visible: body.visible
    };

    const result = await accountsSimpleService.getAccounts(filters, page, limit);

    return {
      code: 0,
      message: '操作成功',
      data: result
    };
  },

  /**
   * Get account by ID
   * GET /game-accounts/:id
   */
  getAccountById: async (request, reply) => {
    const { id } = request.params;
    const account = await accountsSimpleService.getAccountById(id);

    if (!account) {
      return {
        code: 10001,
        message: '账号不存在',
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
   * Create account
   * POST /game-accounts/create
   */
  createAccount: async (request, reply) => {
    const account = await accountsSimpleService.createAccount(request.body);

    return {
      code: 0,
      message: '操作成功',
      data: account
    };
  },

  /**
   * Update account
   * PUT /game-accounts/:id
   */
  updateAccount: async (request, reply) => {
    const { id } = request.params;
    delete request.body.code;
    const account = await accountsSimpleService.updateAccount(id, request.body);

    return {
      code: 0,
      message: '操作成功',
      data: account
    };
  },

  /**
   * Delete account
   * DELETE /game-accounts/:id
   */
  deleteAccount: async (request, reply) => {
    const { id } = request.params;
    await accountsSimpleService.deleteAccount(id);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Batch delete accounts
   * POST /game-accounts/batch-delete
   */
  batchDeleteAccounts: async (request, reply) => {
    const { ids } = request.body || {};

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return {
        code: 10001,
        message: '请选择要删除的账号',
        data: null
      };
    }

    await accountsSimpleService.batchDeleteAccounts(ids);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Import accounts from JSON
   * POST /game-accounts/import
   * Body: { items: [{ account_name, shared_secret, ... }] }
   * The items array can come directly from a parsed JSON file.
   */
  importAccounts: async (request, reply) => {
    const { items } = request.body || {};

    // Support both array and single object
    const data = Array.isArray(items) ? items : (items ? [items] : null);

    if (!data || data.length === 0) {
      return {
        code: 10001,
        message: '导入数据不能为空',
        data: null
      };
    }

    try {
      const result = await accountsSimpleService.importAccounts(data);

      return {
        code: 0,
        message: `成功导入 ${result.inserted} 条，更新 ${result.updated} 条，跳过 ${result.skipped} 条`,
        data: result
      };
    } catch (err) {
      return {
        code: 10002,
        message: err.message,
        data: null
      };
    }
  },


  logout: async (request, reply) => {
    const { id } = request.body || {};
    if (!id) {
      return {
        code: 10001,
        message: '缺少账号ID',
        data: null
      };
    }
    await accountsSimpleService.logout(id);

    return {
      code: 0,
      message: '注销成功',
      data: null
    };
  }
};
