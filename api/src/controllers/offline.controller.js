import {
  offlineGameService,
  offlineVersionService,
  offlineAccountService,
  offlineCdkService,
  offlineCdkGroupService,
  offlineLogService
} from '../services/offline.service.js';
import db from '../utils/db.js';

// ==================== Offline Games Controller ====================
export const offlineGameController = {
  getGames: async (request, reply) => {
    const body = request.body || {};
    const result = await offlineGameService.getGames(
      { name: body.name, status: body.status, platform: body.platform },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getGameById: async (request, reply) => {
    const game = await offlineGameService.getGameById(request.params.id);
    if (!game) return { code: 10001, message: '游戏不存在', data: null };
    return { code: 0, message: '操作成功', data: game };
  },

  createGame: async (request, reply) => {
    const game = await offlineGameService.createGame(request.body);
    return { code: 0, message: '操作成功', data: game };
  },

  updateGame: async (request, reply) => {
    const game = await offlineGameService.updateGame(request.params.id, request.body);
    return { code: 0, message: '操作成功', data: game };
  },

  deleteGame: async (request, reply) => {
    await offlineGameService.deleteGame(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  },

  getAllGames: async (request, reply) => {
    const games = await offlineGameService.getAllGames();
    return { code: 0, message: '操作成功', data: games };
  }
};

// ==================== Offline Version Controller ====================
export const offlineVersionController = {
  getVersions: async (request, reply) => {
    const body = request.body || {};
    const result = await offlineVersionService.getVersions(
      { game_id: body.game_id, name: body.name, status: body.status },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getVersionById: async (request, reply) => {
    const version = await offlineVersionService.getVersionById(request.params.id);
    if (!version) return { code: 10001, message: '版本不存在', data: null };
    return { code: 0, message: '操作成功', data: version };
  },

  createVersion: async (request, reply) => {
    const data = request.body || {};
    if (!data.game_id) return { code: 10001, message: '请选择所属游戏', data: null };
    if (!data.name) return { code: 10001, message: '请输入版本名称', data: null };
    const version = await offlineVersionService.createVersion(data);
    return { code: 0, message: '操作成功', data: version };
  },

  updateVersion: async (request, reply) => {
    const version = await offlineVersionService.updateVersion(request.params.id, request.body);
    return { code: 0, message: '操作成功', data: version };
  },

  deleteVersion: async (request, reply) => {
    await offlineVersionService.deleteVersion(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  },

  getAllVersions: async (request, reply) => {
    const { game_id } = request.query || {};
    const versions = await offlineVersionService.getAllVersions(game_id);
    return { code: 0, message: '操作成功', data: versions };
  }
};

// ==================== Offline Account Controller ====================
export const offlineAccountController = {
  getAccounts: async (request, reply) => {
    const body = request.body || {};
    const result = await offlineAccountService.getAccounts(
      { game_id: body.game_id, version_id: body.version_id, status: body.status, account: body.account },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getAccountById: async (request, reply) => {
    const account = await offlineAccountService.getAccountById(request.params.id);
    if (!account) return { code: 10001, message: '账号不存在', data: null };
    return { code: 0, message: '操作成功', data: account };
  },

  createAccount: async (request, reply) => {
    const data = request.body || {};
    if (!data.game_id) return { code: 10001, message: '请选择所属游戏', data: null };
    if (!data.version_id) return { code: 10001, message: '请选择所属版本', data: null };
    if (!data.account) return { code: 10001, message: '请输入游戏账号', data: null };
    const account = await offlineAccountService.createAccount(data);
    return { code: 0, message: '操作成功', data: account };
  },

  updateAccount: async (request, reply) => {
    const account = await offlineAccountService.updateAccount(request.params.id, request.body);
    return { code: 0, message: '操作成功', data: account };
  },

  deleteAccount: async (request, reply) => {
    await offlineAccountService.deleteAccount(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  },

  batchDeleteAccounts: async (request, reply) => {
    const { ids } = request.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { code: 10001, message: '请选择要删除的账号', data: null };
    }
    await offlineAccountService.batchDeleteAccounts(ids);
    return { code: 0, message: '操作成功', data: null };
  },

  /**
   * Bind SDA shared_secret to EXISTING offline accounts (no new inserts).
   * Match scope: account_name ONLY (cross-game / cross-version). Every matching row is updated.
   * Non-matching account_names are skipped and reported.
   * POST /offline/accounts/import
   * Body: { items: [{ account_name, shared_secret, ... }] }
   */
  importAccounts: async (request, reply) => {
    try {
      const { items } = request.body || {};

      const data = Array.isArray(items) ? items : (items ? [items] : null);
      if (!data || data.length === 0) return { code: 10001, message: '导入数据不能为空', data: null };

      const validItems = data.filter(item => item.account_name);
      if (validItems.length === 0) return { code: 10003, message: '未找到有效的 account_name 数据', data: null };

      let bound = 0;            // 更新的总行数（同一账号跨游戏/版本可能命中多行）
      let matchedAccounts = 0;  // 命中的账号个数
      let skipped = 0;          // account_name 为空被跳过
      const notFound = [];      // 未匹配到任何离线账号行的 account_name

      for (const item of validItems) {
        const account = String(item.account_name || '').trim();
        const code = String(item.shared_secret || '').trim();

        if (!account) { skipped++; continue; }

        // 按账号名跨游戏/版本更新所有已存在的离线账号行；knex .update() 返回受影响行数
        const affected = await db('offline_game_account')
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

// ==================== Offline CDK Controller ====================
export const offlineCdkController = {
  getCdks: async (request, reply) => {
    const body = request.body || {};
    const result = await offlineCdkService.getCdks(
      { game_id: body.game_id, version_id: body.version_id, status: body.status, cdk_code: body.cdk_code },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getCdkById: async (request, reply) => {
    const cdk = await offlineCdkService.getCdkById(request.params.id);
    if (!cdk) return { code: 10001, message: 'CDK不存在', data: null };
    return { code: 0, message: '操作成功', data: cdk };
  },

  createCdk: async (request, reply) => {
    const cdk = await offlineCdkService.createCdk(request.body);
    return { code: 0, message: '操作成功', data: cdk };
  },

  updateCdk: async (request, reply) => {
    const cdk = await offlineCdkService.updateCdk(request.params.id, request.body);
    return { code: 0, message: '操作成功', data: cdk };
  },

  deleteCdk: async (request, reply) => {
    await offlineCdkService.deleteCdk(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  },

  batchDeleteCdks: async (request, reply) => {
    const { ids } = request.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { code: 10001, message: '请选择要删除的CDK', data: null };
    }
    await offlineCdkService.batchDeleteCdks(ids);
    return { code: 0, message: '操作成功', data: null };
  },

  redeemCdk: async (request, reply) => {
    const { cdk_code } = request.body || {};
    if (!cdk_code) return { code: 10001, message: '请输入CDK码', data: null };
    try {
      const result = await offlineCdkService.redeemCdk(cdk_code, request.user?.username || '', request.ip);
      return { code: 0, message: '兑换成功', data: result };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  getCdksByGroup: async (request, reply) => {
    const { group_id } = request.params;
    const body = request.body || {};
    const result = await offlineCdkService.getCdksByGroup(group_id, body.page || 1, body.limit || 50);
    return { code: 0, message: '操作成功', data: result };
  }
};

// ==================== Offline CDK Group Controller ====================
export const offlineCdkGroupController = {
  getGroups: async (request, reply) => {
    const body = request.body || {};
    const result = await offlineCdkGroupService.getGroups(
      { game_id: body.game_id, version_id: body.version_id, name: body.name, status: body.status },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getGroupById: async (request, reply) => {
    const group = await offlineCdkGroupService.getGroupById(request.params.id);
    if (!group) return { code: 10001, message: 'CDK组不存在', data: null };
    return { code: 0, message: '操作成功', data: group };
  },

  createGroup: async (request, reply) => {
    try {
      const group = await offlineCdkGroupService.createGroup(request.body);
      return { code: 0, message: `成功生成 ${group.count} 个CDK`, data: group };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  updateGroup: async (request, reply) => {
    try {
      const group = await offlineCdkGroupService.updateGroup(request.params.id, request.body);
      return { code: 0, message: '操作成功', data: group };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  deleteGroup: async (request, reply) => {
    try {
      await offlineCdkGroupService.deleteGroup(request.params.id);
      return { code: 0, message: '删除成功', data: null };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  }
};

// ==================== Offline Log Controller ====================
export const offlineLogController = {
  getLogs: async (request, reply) => {
    const body = request.body || {};
    const result = await offlineLogService.getLogs(
      { game_id: body.game_id, version_id: body.version_id, username: body.username, cdk_code: body.cdk_code, account: body.account, start_date: body.start_date, end_date: body.end_date },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  deleteLog: async (request, reply) => {
    await offlineLogService.deleteLog(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  }
};
