import { OfflineGameModel } from '../models/offlineGame.model.js';
import { OfflineGameVersionModel } from '../models/offlineGameVersion.model.js';
import { OfflineGameAccountModel } from '../models/offlineGameAccount.model.js';
import { OfflineCdkModel } from '../models/offlineCdk.model.js';
import { OfflineCdkGroupModel } from '../models/offlineCdkGroup.model.js';
import { OfflineLogModel } from '../models/offlineLog.model.js';
import { db } from '../utils/db.js';
import { log } from '../utils/logger.js';
import { AppError } from '../middlewares/error.middleware.js';
import SteamTotp from 'steam-totp';

const offlineGameModel = new OfflineGameModel();
const offlineVersionModel = new OfflineGameVersionModel();
const offlineAccountModel = new OfflineGameAccountModel();
const offlineCdkModel = new OfflineCdkModel();
const offlineCdkGroupModel = new OfflineCdkGroupModel();
const offlineLogModel = new OfflineLogModel();

// ==================== Offline Games ====================
export const offlineGameService = {
  async getGames(filters, page, limit) {
    return await offlineGameModel.getGamesWithFilters(filters, page, limit);
  },

  async getGameById(id) {
    return await offlineGameModel.findById(id);
  },

  async createGame(data) {
    return await offlineGameModel.create({
      name: data.name || '',
      cover: data.cover || '',
      platform: data.platform || 'Steam',
      description: data.description || '',
      price: data.price || 0,
      status: data.status !== undefined ? data.status : 1
    });
  },

  async updateGame(id, data) {
    return await offlineGameModel.update(id, data);
  },

  async deleteGame(id) {
    return await offlineGameModel.delete(id);
  },

  async getAllGames() {
    return await db('offline_games').where('status', 1).orderBy('name');
  }
};

// ==================== Offline Game Versions ====================
export const offlineVersionService = {
  async getVersions(filters, page, limit) {
    return await offlineVersionModel.getVersionsWithFilters(filters, page, limit);
  },

  async getVersionById(id) {
    return await offlineVersionModel.findById(id);
  },

  async createVersion(data) {
    return await offlineVersionModel.create({
      game_id: data.game_id,
      name: data.name || '',
      status: data.status !== undefined ? data.status : 1,
      remark: data.remark || ''
    });
  },

  async updateVersion(id, data) {
    const updateData = {};
    if (data.game_id !== undefined) updateData.game_id = data.game_id;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remark !== undefined) updateData.remark = data.remark;
    return await offlineVersionModel.update(id, updateData);
  },

  async deleteVersion(id) {
    return await offlineVersionModel.delete(id);
  },

  async getAllVersions(gameId) {
    let query = db('offline_game_version').where('status', 1);
    if (gameId) query = query.where('game_id', gameId);
    return await query.orderBy('name');
  }
};

// ==================== Offline Game Accounts ====================
export const offlineAccountService = {
  async getAccounts(filters, page, limit) {
    return await offlineAccountModel.getAccountsWithFilters(filters, page, limit);
  },

  async getAccountById(id) {
    return await offlineAccountModel.findById(id);
  },

  async createAccount(data) {
    return await offlineAccountModel.create({
      game_id: data.game_id,
      version_id: data.version_id,
      account: data.account || '',
      password: data.password || '',
      code: data.code || '',
      status: data.status !== undefined ? data.status : 1
    });
  },

  async updateAccount(id, data) {
    const updateData = {};
    if (data.game_id !== undefined) updateData.game_id = data.game_id;
    if (data.version_id !== undefined) updateData.version_id = data.version_id;
    if (data.account !== undefined) updateData.account = data.account;
    if (data.password !== undefined) updateData.password = data.password;
    if (data.code !== undefined) updateData.code = data.code;
    if (data.status !== undefined) updateData.status = data.status;
    return await offlineAccountModel.update(id, updateData);
  },

  async deleteAccount(id) {
    return await offlineAccountModel.delete(id);
  },

  async batchDeleteAccounts(ids) {
    for (const id of ids) {
      await offlineAccountModel.delete(id);
    }
    return true;
  },

  async importAccounts(gameId, versionId, items) {
    const now = new Date();
    const rows = items.map(item => ({
      game_id: gameId,
      version_id: versionId,
      account: item.account || '',
      password: item.password || '',
      code: item.shared_secret || item.code || '',
      status: 1,
      created_at: now,
      updated_at: now
    }));
    if (rows.length > 0) {
      await db('offline_game_account').insert(rows);
    }
    return { imported: rows.length };
  }
};

// ==================== Offline CDK ====================
const CDK_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCdkCode() {
  const seg = () => Array.from({ length: 4 }, () => CDK_CHARS[Math.floor(Math.random() * CDK_CHARS.length)]).join('');
  return `${seg()}${seg()}${seg()}${seg()}`;
}

export const offlineCdkService = {
  async getCdks(filters, page, limit) {
    return await offlineCdkModel.getCdksWithFilters(filters, page, limit);
  },

  async getCdkById(id) {
    return await offlineCdkModel.findById(id);
  },

  async createCdk(data) {
    return await offlineCdkModel.create({
      game_id: data.game_id,
      version_id: data.version_id,
      cdk_code: data.cdk_code || generateCdkCode(),
      status: 0,
      expire_at: data.expire_at || null
    });
  },

  async updateCdk(id, data) {
    const updateData = {};
    if (data.game_id !== undefined) updateData.game_id = data.game_id;
    if (data.version_id !== undefined) updateData.version_id = data.version_id;
    if (data.account_id !== undefined) updateData.account_id = data.account_id;
    if (data.cdk_code !== undefined) updateData.cdk_code = data.cdk_code;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.expire_at !== undefined) updateData.expire_at = data.expire_at;
    return await offlineCdkModel.update(id, updateData);
  },

  async deleteCdk(id) {
    return await offlineCdkModel.delete(id);
  },

  async batchDeleteCdks(ids) {
    for (const id of ids) {
      await offlineCdkModel.delete(id);
    }
    return true;
  },

  async getCdksByGroup(groupId, page = 1, limit = 50) {
    return await offlineCdkModel.getCdksWithFilters({ group_id: groupId }, page, limit);
  },

  /**
   * Redeem a CDK code:
   * 1. Validate CDK status
   * 2. Find available account from the same version
   * 3. Auto-assign account, mark CDK as used
   * 4. Mark account as redeemed (status=2)
   * 5. Log the redemption
   * 6. Return account info + TOTP
   */
  async redeemCdk(cdkCode, username, ip) {
    const cdk = await db('offline_cdk').where('cdk_code', cdkCode).first();
    if (!cdk) throw new AppError('CDK码不存在');
    if (cdk.status === 1) throw new AppError('该CDK已被使用');
    if (cdk.status === 2) throw new AppError('该CDK已过期');
    if (cdk.status === 3) throw new AppError('该CDK已被禁用');
    if (cdk.expire_at && new Date(cdk.expire_at) < new Date()) {
      await db('offline_cdk').where('id', cdk.id).update({ status: 2 });
      throw new AppError('该CDK已过期');
    }

    // Look up game and version
    const game = await db('offline_games').where('id', cdk.game_id).first();
    const version = await db('offline_game_version').where('id', cdk.version_id).first();

    // Auto-assign the enabled account with the FEWEST bound CDKs (load balance).
    // Accounts are NOT consumed: one account can be bound by unlimited CDKs.
    const candidates = await db('offline_game_account')
      .where('version_id', cdk.version_id)
      .where('status', 1)
      .orderBy('id', 'asc');

    if (candidates.length === 0) {
      throw new AppError('该版本下暂无可用账号');
    }

    const boundCounts = await db('offline_cdk')
      .whereIn('account_id', candidates.map(a => a.id))
      .where('status', 1)
      .select('account_id')
      .count('* as cnt')
      .groupBy('account_id');
    const countMap = {};
    for (const r of boundCounts) countMap[r.account_id] = parseInt(r.cnt, 10);

    // Pick fewest-bound; candidates already ordered by id asc for a stable tie-break
    let account = candidates[0];
    let minCount = countMap[account.id] || 0;
    for (const a of candidates) {
      const c = countMap[a.id] || 0;
      if (c < minCount) {
        minCount = c;
        account = a;
      }
    }

    const now = new Date();

    // Mark CDK as used, bind account
    await db('offline_cdk').where('id', cdk.id).update({
      status: 1,
      account_id: account.id,
      used_by: username,
      used_at: now,
      updated_at: now
    });

    // Note: the account is NOT consumed — it stays status=1 and can be bound
    // by additional CDKs (one account : many CDKs).

    // Log the redemption
    await db('offline_log').insert({
      cdk_id: cdk.id,
      game_id: cdk.game_id,
      version_id: cdk.version_id,
      account_id: account.id,
      game_name: game?.name || '',
      version_name: version?.name || '',
      cdk_code: cdk.cdk_code,
      account: account.account,
      action: 'redeem',
      username: username || '',
      ip: ip || ''
    });

    // Generate TOTP
    let totp_code = '';
    if (account.code) {
      try {
        totp_code = SteamTotp.generateAuthCode(account.code);
      } catch (e) {
        totp_code = '';
      }
    }

    log.info(`[OfflineCDK] Redeemed: ${cdkCode} by ${username}, account: ${account.account}`);
    return {
      account: account.account,
      password: account.password,
      totp_code,
      game_name: game?.name || '',
      version_name: version?.name || ''
    };
  }
};

// ==================== Offline CDK Group ====================
export const offlineCdkGroupService = {
  async getGroups(filters, page, limit) {
    return await offlineCdkGroupModel.getGroupsWithFilters(filters, page, limit);
  },

  async getGroupById(id) {
    return await offlineCdkGroupModel.findById(id);
  },

  /**
   * Create a CDK group and batch-generate CDK codes
   */
  async createGroup(data) {
    const { game_id, version_id, count, remark } = data;
    if (!game_id) throw new AppError('请选择所属游戏');
    if (!version_id) throw new AppError('请选择所属版本');
    if (!count || count < 1) throw new AppError('请输入生成数量');
    if (count > 500) throw new AppError('单次最多生成500个CDK');

    const now = new Date();

    // Look up game and version name for auto-naming
    const game = await db('offline_games').where('id', game_id).first();
    const version = await db('offline_game_version').where('id', version_id).first();
    const gameName = game?.name || '未知游戏';
    const versionName = version?.name || '未知版本';
    const dateStr = now.toISOString().slice(0, 10);
    const autoName = `${dateStr}-${gameName}-${versionName}`;

    // 1. Create the group record
    const group = await offlineCdkGroupModel.create({
      game_id,
      version_id,
      name: autoName,
      count: parseInt(count, 10),
      status: 1,
      remark: remark || '',
      expire_at: data.expire_at || null
    });

    // 2. Batch generate unique CDK codes
    const existingCodes = new Set(
      (await db('offline_cdk').select('cdk_code')).map(r => r.cdk_code)
    );

    const cdkRows = [];
    let attempts = 0;
    const maxAttempts = count * 10;
    while (cdkRows.length < count && attempts < maxAttempts) {
      const code = generateCdkCode();
      if (!existingCodes.has(code)) {
        existingCodes.add(code);
        cdkRows.push({
          group_id: group.id,
          game_id,
          version_id,
          cdk_code: code,
          status: 0,
          expire_at: data.expire_at || null,
          created_at: now,
          updated_at: now
        });
      }
      attempts++;
    }

    // 3. Bulk insert CDKs
    if (cdkRows.length > 0) {
      await db('offline_cdk').insert(cdkRows);
    }

    // 4. Update group count with actual generated count
    await offlineCdkGroupModel.update(group.id, { count: cdkRows.length });

    log.info(`[OfflineCdkGroup] Created group ${group.id}: ${cdkRows.length} CDKs for game ${game_id}, version ${version_id}`);
    return { ...group, count: cdkRows.length };
  },

  async updateGroup(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remark !== undefined) updateData.remark = data.remark;
    if (data.expire_at !== undefined) updateData.expire_at = data.expire_at;
    return await offlineCdkGroupModel.update(id, updateData);
  },

  /**
   * Delete group and all its CDKs (only if no CDK has been used)
   */
  async deleteGroup(id) {
    const usedCount = await db('offline_cdk')
      .where('group_id', id)
      .where('status', 1)
      .count('* as count')
      .then(r => parseInt(r[0].count, 10));

    if (usedCount > 0) {
      throw new AppError(`该CDK组有 ${usedCount} 个CDK已被使用，无法删除`);
    }

    // Delete all CDKs in this group
    await db('offline_cdk').where('group_id', id).del();
    // Delete the group
    await offlineCdkGroupModel.delete(id);
    return true;
  }
};

// ==================== Offline Log ====================
export const offlineLogService = {
  async getLogs(filters, page, limit) {
    return await offlineLogModel.getLogsWithFilters(filters, page, limit);
  },

  async deleteLog(id) {
    return await offlineLogModel.delete(id);
  }
};
