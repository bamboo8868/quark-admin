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
import SteamUser from 'steam-user';
import SteamCommunity from 'steamcommunity';

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
      refresh_count: data.refresh_count !== undefined && data.refresh_count !== null && data.refresh_count !== '' ? Number(data.refresh_count) : 3,
      status: data.status !== undefined ? data.status : 1
    });
  },

  async updateGame(id, data) {
    if (data.refresh_count !== undefined && data.refresh_count !== null && data.refresh_count !== '') {
      data.refresh_count = Number(data.refresh_count);
    }
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
/**
 * 通过 steam-user 建立一条新的 CM 连接再断开：Steam 会把该账号当前在线的
 * 客户端以 "LoggedInElsewhere" 强制登出，实现真正的"退出登录"（而非仅置离线）。
 */
function kickSteamCmSessions(accountInfo, twoFactorCode) {
  const client = new SteamUser({ autoRelogin: false, machineName: 'offline-logout' });
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (msg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { client.logOff(); } catch (_) { /* ignore */ }
      reject(new Error(msg));
    };
    // 兜底超时，避免 logOn 无响应时请求长时间挂起
    const timer = setTimeout(() => fail('Steam 登录超时，请重试'), 30000);

    client.on('error', (err) => {
      const eresult = err.eresult;
      const name = eresult !== undefined && SteamUser.EResult[eresult]
        ? SteamUser.EResult[eresult]
        : eresult;
      fail(`Steam 登录/协议错误: ${err.message}${name ? ` (EResult: ${name})` : ''}`);
    });

    client.on('steamGuard', (domain, callback, lastCodeWrong) => {
      fail(lastCodeWrong
        ? 'Steam Guard 验证码错误 (twoFactorCode 无效或已过期)'
        : `Steam Guard 请求验证码 (domain=${domain}) — 请检查 shared_secret`);
    });

    // 登录成功：新的 CM 连接已把对方客户端以 LoggedInElsewhere 踢下线
    client.on('loggedOn', () => {
      if (settled) return;
      // 稍等会话稳定，再断开自身连接完成"退出登录"（不再 setPersona Offline）
      setTimeout(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try { client.logOff(); } catch (_) { /* ignore */ }
        resolve();
      }, 1500);
    });

    try {
      client.logOn({
        accountName: accountInfo.account,
        password: accountInfo.password,
        twoFactorCode
      });
    } catch (e) {
      fail(`logOn 调用失败: ${e.message}`);
    }
  });
}

/**
 * 通过 SteamCommunity web 反授权所有设备 + 登出 web 会话（对应 Steam 官方
 * Manage Steam Guard -> Deauthorize all devices / Sign out everywhere）：
 * 清除"记住我"的设备授权，避免被踢下线的客户端自动重连。
 * 注意：deauthorize 只移除设备授权，不会移除身份验证器，shared_secret 仍然有效。
 */
async function deauthorizeAllDevicesWeb(accountInfo, twoFactorCode) {
  const steamObj = new SteamCommunity();
  const sessionId = await new Promise((resolve, reject) => {
    steamObj.login(
      { accountName: accountInfo.account, password: accountInfo.password, twoFactorCode },
      (err, sid) => (err ? reject(err) : resolve(sid))
    );
  });
  let sid = sessionId;
  if (typeof sid === 'string' && sid.includes(';')) sid = sid.split(';')[0];

  const post = (options) => new Promise((resolve, reject) => {
    steamObj.httpRequestPost(options, (err, response, body) => (err ? reject(err) : resolve({ response, body })));
  });

  // 反授权所有设备
  let res = await post({
    uri: 'https://store.steampowered.com/twofactor/manage_action',
    formData: { action: 'deauthorize', sessionid: sid }
  });

  // 登出 web 会话
  await post({
    uri: 'https://store.steampowered.com/logout',
    form: { sessionid: sid },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
}

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
  },

  /**
   * 在所有地方退出登录 Steam 账号（全端注销）：
   *   1) CM 踢下线：新建 CM 连接使当前在线客户端收到 LoggedInElsewhere 被强制登出，
   *      随后断开自身连接——这才是真正的"退出登录"，而不是仅把状态置为离线。
   *   2) Web 反授权所有设备 + 登出：清除"记住我"的设备授权，避免客户端自动重连。
   * 账号来源为 offline_game_account；shared_secret 不受影响，之后仍可正常登录租用。
   */
  async logout(id) {
    const accountInfo = await db('offline_game_account').where('id', id).first();
    if (!accountInfo) throw new AppError('账号不存在');
    if (!accountInfo.password) throw new AppError('账号密码不存在');
    if (!accountInfo.code) throw new AppError('账号缺少动态码(shared_secret)，无法注销');

    // 1) CM 踢下线（主手段：真正让当前在线客户端退出登录）
    let cmCode;
    try {
      cmCode = SteamTotp.generateAuthCode(accountInfo.code);
    } catch (err) {
      log.error(`[OfflineAccount] generateAuthCode 失败(id=${id}): ${err.message}`);
      throw new AppError('生成Steam验证码失败，请检查shared_secret');
    }
    try {
      await kickSteamCmSessions(accountInfo, cmCode);
      log.info(`[OfflineAccount] CM 会话已踢下线: ${accountInfo.account} (id=${id})`);
    } catch (err) {
      log.error(`[OfflineAccount] CM 踢下线失败(id=${id}): ${err.message}`);
      throw new AppError(`注销失败：${err.message}`);
    }

    // 2) Web 反授权所有设备 + 登出（best-effort：防止自动重连）
    //    与 CM 登录靠得很近，验证码可能同窗口被 Steam 拒绝，故失败不影响主流程。
    try {
      const webCode = SteamTotp.generateAuthCode(accountInfo.code);
      await deauthorizeAllDevicesWeb(accountInfo, webCode);
      log.info(`[OfflineAccount] 已反授权所有设备并登出 web 会话: ${accountInfo.account} (id=${id})`);
    } catch (err) {
      log.error(`[OfflineAccount] web 反授权失败(不影响已踢下线): ${err.message}`);
    }
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
