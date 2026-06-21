import { rentGameService, rentCdkService, rentCdkGroupService, rentLogService } from '../services/rent.service.js';
import { RentGameAccountModel } from '../models/rentGameAccount.model.js';
import db from '../utils/db.js';

const rentGameAccountModel = new RentGameAccountModel();

// ==================== Rent Games Controller ====================
export const rentGameController = {
  getGames: async (request, reply) => {
    const body = request.body || {};
    const result = await rentGameService.getGames(
      { name: body.name, status: body.status, platform: body.platform },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getGameById: async (request, reply) => {
    const game = await rentGameService.getGameById(request.params.id);
    if (!game) return { code: 10001, message: '游戏不存在', data: null };
    return { code: 0, message: '操作成功', data: game };
  },

  createGame: async (request, reply) => {
    const game = await rentGameService.createGame(request.body);
    return { code: 0, message: '操作成功', data: game };
  },

  updateGame: async (request, reply) => {
    const game = await rentGameService.updateGame(request.params.id, request.body);
    return { code: 0, message: '操作成功', data: game };
  },

  deleteGame: async (request, reply) => {
    await rentGameService.deleteGame(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  },

  getAllGames: async (request, reply) => {
    const games = await rentGameService.getAllGames();
    return { code: 0, message: '操作成功', data: games };
  }
};

// ==================== Rent CDK Controller ====================
export const rentCdkController = {
  getCdks: async (request, reply) => {
    const body = request.body || {};
    const result = await rentCdkService.getCdks(
      { game_id: body.game_id, status: body.status, cdk_code: body.cdk_code, account: body.account },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getCdkById: async (request, reply) => {
    const cdk = await rentCdkService.getCdkById(request.params.id);
    if (!cdk) return { code: 10001, message: 'CDK不存在', data: null };
    return { code: 0, message: '操作成功', data: cdk };
  },

  createCdk: async (request, reply) => {
    const cdk = await rentCdkService.createCdk(request.body);
    return { code: 0, message: '操作成功', data: cdk };
  },

  updateCdk: async (request, reply) => {
    const cdk = await rentCdkService.updateCdk(request.params.id, request.body);
    return { code: 0, message: '操作成功', data: cdk };
  },

  deleteCdk: async (request, reply) => {
    await rentCdkService.deleteCdk(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  },

  batchDeleteCdks: async (request, reply) => {
    const { ids } = request.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { code: 10001, message: '请选择要删除的CDK', data: null };
    }
    await rentCdkService.batchDeleteCdks(ids);
    return { code: 0, message: '操作成功', data: null };
  },

  redeemCdk: async (request, reply) => {
    const { cdk_code } = request.body || {};
    if (!cdk_code) return { code: 10001, message: '请输入CDK码', data: null };
    const result = await rentCdkService.redeemCdk(cdk_code, request.user?.username || '', request.ip);
    return { code: 0, message: '兑换成功', data: result };
  },

  /** Get CDKs by group_id */
  getCdksByGroup: async (request, reply) => {
    const { group_id } = request.params;
    const body = request.body || {};
    const result = await rentCdkService.getCdksByGroup(
      group_id,
      body.page || 1,
      body.limit || 50
    );
    return { code: 0, message: '操作成功', data: result };
  }
};

// ==================== Rent CDK Group Controller ====================
export const rentCdkGroupController = {
  getGroups: async (request, reply) => {
    const body = request.body || {};
    const result = await rentCdkGroupService.getGroups(
      { game_id: body.game_id, name: body.name, status: body.status },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getGroupById: async (request, reply) => {
    const group = await rentCdkGroupService.getGroupById(request.params.id);
    if (!group) return { code: 10001, message: 'CDK组不存在', data: null };
    return { code: 0, message: '操作成功', data: group };
  },

  createGroup: async (request, reply) => {
    try {
      const group = await rentCdkGroupService.createGroup(request.body);
      return { code: 0, message: `成功生成 ${group.count} 个CDK`, data: group };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  updateGroup: async (request, reply) => {
    try {
      const group = await rentCdkGroupService.updateGroup(request.params.id, request.body);
      return { code: 0, message: '操作成功', data: group };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  deleteGroup: async (request, reply) => {
    try {
      await rentCdkGroupService.deleteGroup(request.params.id);
      return { code: 0, message: '删除成功', data: null };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  }
};

// ==================== Rent Log Controller ====================
export const rentLogController = {
  getLogs: async (request, reply) => {
    const body = request.body || {};
    const result = await rentLogService.getLogs(
      { game_id: body.game_id, action: body.action, username: body.username, cdk_code: body.cdk_code, account: body.account, start_date: body.start_date, end_date: body.end_date },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  deleteLog: async (request, reply) => {
    await rentLogService.deleteLog(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  }
};

// ==================== Rent Game Account Controller ====================
export const rentGameAccountController = {
  getAccounts: async (request, reply) => {
    const body = request.body || {};
    const result = await rentGameAccountModel.getAccountsWithFilters(
      { game_id: body.game_id, status: body.status, account: body.account },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getAccountById: async (request, reply) => {
    const account = await rentGameAccountModel.findById(request.params.id);
    if (!account) return { code: 10001, message: '账号不存在', data: null };
    return { code: 0, message: '操作成功', data: account };
  },

  createAccount: async (request, reply) => {
    const data = request.body || {};
    if (!data.game_id) return { code: 10001, message: '请选择所属游戏', data: null };
    if (!data.account) return { code: 10001, message: '请输入游戏账号', data: null };
    const account = await rentGameAccountModel.create({
      game_id: data.game_id,
      account: data.account || '',
      password: data.password || '',
      status: data.status !== undefined ? data.status : 1
    });
    return { code: 0, message: '操作成功', data: account };
  },

  updateAccount: async (request, reply) => {
    const updateData = {};
    const data = request.body || {};
    if (data.game_id !== undefined) updateData.game_id = data.game_id;
    if (data.account !== undefined) updateData.account = data.account;
    if (data.password !== undefined) updateData.password = data.password;
    if (data.status !== undefined) updateData.status = data.status;
    const account = await rentGameAccountModel.update(request.params.id, updateData);
    return { code: 0, message: '操作成功', data: account };
  },

  deleteAccount: async (request, reply) => {
    await rentGameAccountModel.delete(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  },

  batchDeleteAccounts: async (request, reply) => {
    const { ids } = request.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { code: 10001, message: '请选择要删除的账号', data: null };
    }
    for (const id of ids) {
      await rentGameAccountModel.delete(id);
    }
    return { code: 0, message: '操作成功', data: null };
  },

  /**
   * Import accounts from JSON file (SDA format)
   * POST /rent/accounts/import
   * Body: { game_id, items: [{ account_name, shared_secret, ... }] }
   */
  importExcel: async (request, reply) => {
    try {
      const { game_id, items } = request.body || {};

      if (!game_id) {
        return { code: 10001, message: '请选择所属游戏', data: null };
      }

      // Support both array and single object
      const data = Array.isArray(items) ? items : (items ? [items] : null);

      if (!data || data.length === 0) {
        return { code: 10001, message: '导入数据不能为空', data: null };
      }

      // Check game exists
      const game = await db('rent_games').where('id', game_id).first();
      if (!game) {
        return { code: 10002, message: '游戏不存在', data: null };
      }

      // Filter valid items (must have account_name)
      const validItems = data.filter(item => item.account_name);

      if (validItems.length === 0) {
        return { code: 10003, message: '未找到有效的 account_name 数据', data: null };
      }

      let inserted = 0;
      let updated = 0;
      let skipped = 0;

      for (const item of validItems) {
        const account = String(item.account_name || '').trim();
        const code = String(item.shared_secret || '').trim();

        if (!account) {
          skipped++;
          continue;
        }

        // Check if account already exists for this game
        const existing = await db('rent_game_account')
          .where('game_id', game_id)
          .where('account', account)
          .first();

        if (existing) {
          // Update existing account's code
          await db('rent_game_account')
            .where('id', existing.id)
            .update({ code, updated_at: new Date() });
          updated++;
        } else {
          // Insert new account
          await rentGameAccountModel.create({
            game_id,
            account,
            password: '',
            code,
            status: 1
          });
          inserted++;
        }
      }

      return {
        code: 0,
        message: `导入完成：新增 ${inserted} 条，更新 ${updated} 条，跳过 ${skipped} 条`,
        data: { inserted, updated, skipped }
      };
    } catch (err) {
      return { code: 10002, message: err.message || '导入失败', data: null };
    }
  }
};
