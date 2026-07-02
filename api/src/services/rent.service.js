import { RentGameModel } from '../models/rentGame.model.js';
import { RentCdkModel } from '../models/rentCdk.model.js';
import { RentCdkGroupModel } from '../models/rentCdkGroup.model.js';
import { RentLogModel } from '../models/rentLog.model.js';
import { db } from '../utils/db.js';
import { log } from '../utils/logger.js';
import { AppError } from '../middlewares/error.middleware.js';

const rentGameModel = new RentGameModel();
const rentCdkModel = new RentCdkModel();
const rentCdkGroupModel = new RentCdkGroupModel();
const rentLogModel = new RentLogModel();

// ==================== Rent Games ====================
export const rentGameService = {
  async getGames(filters, page, limit) {
    return await rentGameModel.getGamesWithFilters(filters, page, limit);
  },

  async getGameById(id) {
    return await rentGameModel.findById(id);
  },

  async createGame(data) {
    return await rentGameModel.create({
      name: data.name || '',
      cover: data.cover || '',
      platform: data.platform || 'Steam',
      description: data.description || '',
      price: data.price || 0,
      status: data.status !== undefined ? data.status : 1
    });
  },

  async updateGame(id, data) {
    return await rentGameModel.update(id, data);
  },

  async deleteGame(id) {
    return await rentGameModel.delete(id);
  },

  async getAllGames() {
    return await db('rent_games').where('status', 1).orderBy('name');
  }
};

// ==================== Rent CDK ====================
export const rentCdkService = {
  async getCdks(filters, page, limit) {
    return await rentCdkModel.getCdksWithFilters(filters, page, limit);
  },

  async getCdkById(id) {
    return await rentCdkModel.findById(id);
  },

  async createCdk(data) {
    return await rentCdkModel.create({
      game_id: data.game_id,
      account_id: data.account_id || null,
      cdk_code: data.cdk_code,
      rent_hours: data.rent_hours || 24,
      status: 0,
      expire_at: data.expire_at || null
    });
  },

  async updateCdk(id, data) {
    const updateData = {};
    if (data.game_id !== undefined) updateData.game_id = data.game_id;
    if (data.account_id !== undefined) updateData.account_id = data.account_id;
    if (data.cdk_code !== undefined) updateData.cdk_code = data.cdk_code;
    if (data.rent_hours !== undefined) updateData.rent_hours = data.rent_hours;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.expire_at !== undefined) updateData.expire_at = data.expire_at;
    return await rentCdkModel.update(id, updateData);
  },

  async deleteCdk(id) {
    return await rentCdkModel.delete(id);
  },

  async batchDeleteCdks(ids) {
    for (const id of ids) {
      await rentCdkModel.delete(id);
    }
    return true;
  },

  /**
   * Get CDKs by group_id
   */
  async getCdksByGroup(groupId, page = 1, limit = 50) {
    return await rentCdkModel.getCdksWithFilters({ group_id: groupId }, page, limit);
  },

  /**
   * Redeem a CDK code:
   * 1. Validate CDK status
   * 2. Look up account from rent_game_account via account_id
   * 3. Mark CDK as used, calculate rent_expire_at
   * 4. Mark account as rented (status=2)
   * 5. Log the redemption
   */
  async redeemCdk(cdkCode, username, ip) {
    const cdk = await db('rent_cdk').where('cdk_code', cdkCode).first();
    if (!cdk) throw new AppError('CDK码不存在');
    if (cdk.status === 1) throw new AppError('该CDK已被使用');
    if (cdk.status === 2) throw new AppError('该CDK已过期');
    if (cdk.status === 3) throw new AppError('该CDK已被禁用');
    if (cdk.expire_at && new Date(cdk.expire_at) < new Date()) {
      await db('rent_cdk').where('id', cdk.id).update({ status: 2 });
      throw new AppError('该CDK已过期');
    }

    // Look up game
    const game = await db('rent_games').where('id', cdk.game_id).first();

    // Look up account from rent_game_account
    let account = null;
    if (cdk.account_id) {
      account = await db('rent_game_account').where('id', cdk.account_id).first();
      if (!account) throw new AppError('关联的游戏账号不存在');
      if (account.status === 2) throw new AppError('该游戏账号已被出租中');
    } else {
      throw new AppError('该CDK未关联游戏账号');
    }

    // Calculate rent_expire_at
    const now = new Date();
    const rentExpireAt = new Date(now.getTime() + (cdk.rent_hours || 24) * 60 * 60 * 1000);

    // Mark CDK as used
    await db('rent_cdk').where('id', cdk.id).update({
      status: 1,
      used_by: username,
      used_at: now,
      rent_expire_at: rentExpireAt,
      updated_at: now
    });

    // Mark account as rented with time range
    await db('rent_game_account').where('id', account.id).update({
      status: 2,
      rent_start_at: now,
      rent_end_at: rentExpireAt,
      updated_at: now
    });

    // Log the redemption
    await db('rent_log').insert({
      cdk_id: cdk.id,
      game_id: cdk.game_id,
      account_id: account.id,
      game_name: game?.name || '',
      cdk_code: cdk.cdk_code,
      account: account.account,
      rent_hours: cdk.rent_hours || 24,
      action: 'redeem',
      username: username || '',
      ip: ip || ''
    });

    log.info(`[RentCDK] Redeemed: ${cdkCode} by ${username}, expires at ${rentExpireAt.toISOString()}`);
    return {
      account: account.account,
      password: account.password,
      game_name: game?.name || '',
      rent_hours: cdk.rent_hours || 24,
      rent_expire_at: rentExpireAt
    };
  },

  /**
   * Get active rentals for a user
   */
  async getMyRentals(username) {
    return await db('rent_log as l')
      .leftJoin('rent_games as g', 'l.game_id', 'g.id')
      .select(
        'l.*',
        'g.name as game_name_full',
        'g.cover as game_cover',
        'g.platform as game_platform'
      )
      .where('l.username', username)
      .where('l.action', 'redeem')
      .orderBy('l.created_at', 'desc');
  }
};

// ==================== Rent CDK Group ====================
const CDK_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCdkCode() {
  const seg = () => Array.from({ length: 4 }, () => CDK_CHARS[Math.floor(Math.random() * CDK_CHARS.length)]).join('');
  return `${seg()}${seg()}${seg()}${seg()}`;
}

export const rentCdkGroupService = {
  async getGroups(filters, page, limit) {
    return await rentCdkGroupModel.getGroupsWithFilters(filters, page, limit);
  },

  async getGroupById(id) {
    return await rentCdkGroupModel.findById(id);
  },

  /**
   * Create a CDK group and batch-generate CDK codes
   */
  async createGroup(data) {
    const { game_id, count, rent_hours, remark } = data;
    if (!game_id) throw new AppError('请选择所属游戏');
    if (!count || count < 1) throw new AppError('请输入生成数量');
    if (count > 500) throw new AppError('单次最多生成500个CDK');

    const now = new Date();

    // Look up game name for auto-naming
    const game = await db('rent_games').where('id', game_id).first();
    const gameName = game?.name || '未知游戏';
    const dateStr = now.toISOString().slice(0, 10);
    const autoName = `${dateStr}-${gameName}-${rent_hours || 24}h`;

    // 1. Create the group record
    const group = await rentCdkGroupModel.create({
      game_id,
      name: autoName,
      count: parseInt(count, 10),
      rent_hours: rent_hours || 24,
      status: 1,
      remark: remark || ''
    });

    // 2. Batch generate unique CDK codes
    const existingCodes = new Set(
      (await db('rent_cdk').select('cdk_code')).map(r => r.cdk_code)
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
          cdk_code: code,
          rent_hours: rent_hours || 24,
          status: 0,
          created_at: now,
          updated_at: now
        });
      }
      attempts++;
    }

    // 3. Bulk insert CDKs
    if (cdkRows.length > 0) {
      await db('rent_cdk').insert(cdkRows);
    }

    // 4. Update group count with actual generated count
    await rentCdkGroupModel.update(group.id, { count: cdkRows.length });

    log.info(`[RentCdkGroup] Created group ${group.id}: ${cdkRows.length} CDKs for game ${game_id}`);
    return { ...group, count: cdkRows.length };
  },

  async updateGroup(id, data) {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.remark !== undefined) updateData.remark = data.remark;
    return await rentCdkGroupModel.update(id, updateData);
  },

  /**
   * Delete group and all its CDKs (only if no CDK has been used)
   */
  async deleteGroup(id) {
    const usedCount = await db('rent_cdk')
      .where('group_id', id)
      .where('status', 1)
      .count('* as count')
      .then(r => parseInt(r[0].count, 10));

    if (usedCount > 0) {
      throw new AppError(`该CDK组有 ${usedCount} 个CDK已被使用，无法删除`);
    }

    // Delete all CDKs in this group
    await db('rent_cdk').where('group_id', id).del();
    // Delete the group
    await rentCdkGroupModel.delete(id);
    return true;
  }
};

// ==================== Rent Log ====================
export const rentLogService = {
  async getLogs(filters, page, limit) {
    return await rentLogModel.getLogsWithFilters(filters, page, limit);
  },

  async deleteLog(id) {
    return await rentLogModel.delete(id);
  }
};
