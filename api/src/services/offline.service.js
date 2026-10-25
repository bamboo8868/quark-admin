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
// 「注销所有设备」Playwright 方案（与根目录 flush_playwright.js 一致）：
// steamcommunity 负责登录拿鉴权 cookie（含 steamLoginSecure / sessionid），
// 注入真实 Chromium → 打开授权设备页（浏览器自动执行 Akamai sensor JS，拿到 ak_bmsc/_abck/bm_sv）
// → 在页面内用 fetch 发注销请求（真实浏览器上下文 = Akamai 干净）→ 登出。
// 替代原 CM webLogOn 派生 cookie + flushAll 直发 HTTP 的方案：CM 派生 cookie 不带 Akamai
// cookie(ak_bmsc/bm_sv)，manage_action 可能被 Steam 静默拒绝。

const STORE_ORIGIN = 'https://store.steampowered.com';

// 把 steamcommunity 返回的 Set-Cookie 字符串解析成 Playwright 需要的 cookie 对象
function parseSetCookie(str) {
  const parts = String(str).split(';');
  const nv = parts.shift();
  const eq = nv.indexOf('=');
  if (eq === -1) return null;
  const cookie = { name: nv.slice(0, eq).trim(), value: nv.slice(eq + 1).trim() };
  for (let attr of parts) {
    attr = attr.trim();
    const low = attr.toLowerCase();
    if (low.startsWith('domain=')) cookie.domain = attr.slice(7).trim();
    else if (low.startsWith('path=')) cookie.path = attr.slice(5).trim();
    else if (low === 'secure') cookie.secure = true;
    else if (low === 'httponly') cookie.httpOnly = true;
    else if (low.startsWith('expires=')) {
      const t = Date.parse(attr.slice(8));
      if (!isNaN(t)) cookie.expires = Math.floor(t / 1000);
    } else if (low.startsWith('samesite=')) {
      const v = attr.slice(9).trim().toLowerCase();
      if (v === 'lax' || v === 'strict' || v === 'none') {
        cookie.sameSite = v.charAt(0).toUpperCase() + v.slice(1);
      }
    }
  }
  if (!cookie.path) cookie.path = '/';
  if (cookie.sameSite === 'None') cookie.secure = true; // None 必须配合 Secure
  return cookie;
}

// 没有 Domain 的 cookie，给 store / community 两个域各注入一份
function expandCookies(rawCookies) {
  const out = [];
  const domains = ['.steampowered.com', '.steamcommunity.com'];
  for (const c of rawCookies || []) {
    const parsed = parseSetCookie(c);
    if (!parsed) continue;
    if (parsed.domain) out.push(parsed);
    else for (const d of domains) out.push({ ...parsed, domain: d });
  }
  return out;
}

// 用 steamcommunity 登录拿 web 会话，返回 { sessionId, cookies }
function loginSteamCommunity(accountName, password, sharedSecret) {
  return new Promise((resolve, reject) => {
    const steamObj = new SteamCommunity();
    const twoFactorCode = SteamTotp.generateAuthCode(sharedSecret);
    steamObj.login({ accountName, password, twoFactorCode }, (err, sessionId, cookies) => {
      if (err) return reject(err);
      if (sessionId && typeof sessionId === 'string' && sessionId.includes(';')) {
        sessionId = sessionId.split(';')[0];
      }
      resolve({ sessionId, cookies });
    });
  });
}

// 注销需要启动真实浏览器，开销较大，用 Promise 链串行化，避免并发注销同时开多个浏览器
let logoutQueue = Promise.resolve();

/**
 * Playwright 版「注销所有设备」：
 * 1. steamcommunity 登录拿 cookie → 2. 启动真实浏览器(优先系统 Chrome/Edge，免下载 Chromium 且指纹更真)
 * → 3. 注入 cookie → 4. 打开 /account/authorizeddevices 让浏览器自动跑 Akamai JS
 * → 5. 页面内 fetch 执行 manage_action(action=deauthorize) → 6. 页面内 fetch 登出。
 * 失败一律抛错，由调用方决定是否包装为 AppError。
 */
async function deauthorizeAllDevicesViaBrowser({ accountName, password, sharedSecret }) {
  const { chromium } = await import('playwright');

  // 1. steamcommunity 登录
  const { sessionId, cookies } = await loginSteamCommunity(accountName, password, sharedSecret);
  log.info(`[OfflineAccount] steamcommunity 登录成功: ${accountName} sessionId=${sessionId}`);

  // 2. 启动浏览器；用真实浏览器时不覆盖 userAgent，保持 UA 与指纹一致（更不易被 Akamai 识破）
  const HEADLESS = process.env.PW_HEADLESS !== 'false';
  const CHANNEL = process.env.PW_CHANNEL || 'chrome'; // 'chrome' | 'msedge' | ''(内置Chromium)
  const launchArgs = ['--disable-blink-features=AutomationControlled'];
  let browser;
  try {
    browser = await chromium.launch({ headless: HEADLESS, channel: CHANNEL, args: launchArgs });
  } catch (e) {
    log.warn(`[OfflineAccount] channel=${CHANNEL} 启动失败(${e.message})，回退到 msedge...`);
    try {
      browser = await chromium.launch({ headless: HEADLESS, channel: 'msedge', args: launchArgs });
    } catch (e2) {
      log.warn(`[OfflineAccount] msedge 也失败(${e2.message})，回退到内置 Chromium...`);
      browser = await chromium.launch({ headless: HEADLESS, args: launchArgs });
    }
  }
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1366, height: 900 } });

  try {
    // 3. 注入登录 cookie
    const pwCookies = expandCookies(cookies);
    await context.addCookies(pwCookies);

    const page = await context.newPage();

    // 4. 打开授权设备页（浏览器自动跑 Akamai JS，拿到 ak_bmsc/_abck/bm_sv）
    await page.goto(`${STORE_ORIGIN}/account/authorizeddevices`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    if (/\/login|\/account\/login/i.test(page.url())) {
      throw new Error('未登录：被重定向到登录页，注入的 cookie 可能无效');
    }

    // 5. 页面内 fetch 执行「注销所有设备」（等同点击按钮）
    const result = await page.evaluate(async (fallbackSessionId) => {
      const m = document.cookie.match(/(?:^|;\s*)sessionid=([^;]+)/);
      const sessionid = m ? decodeURIComponent(m[1]) : fallbackSessionId;
      const fd = new FormData();
      fd.append('action', 'deauthorize');
      fd.append('sessionid', sessionid);
      const res = await fetch('/twofactor/manage_action', {
        method: 'POST',
        body: fd,
        headers: { 'Accept': 'application/json, text/plain, */*' },
        credentials: 'include'
      });
      let text = '';
      try { text = await res.text(); } catch (e) { /* ignore */ }
      return { status: res.status, url: res.url, body: text.slice(0, 800) };
    }, sessionId);

    // 必须校验真实响应：fetch 不抛错只代表“请求完成”，不代表 Steam 真的受理了反授权
    log.info(`[OfflineAccount] deauthorize 响应: status=${result.status} body=${result.body}`);
    if (result.status !== 200) {
      throw new Error(`反授权请求失败: HTTP ${result.status}`);
    }
    if (/"success"\s*:\s*false/i.test(result.body)) {
      throw new Error(`Steam 拒绝反授权: ${result.body.slice(0, 200)}`);
    }

    // 6. 登出 web 会话（失败不影响反授权结果，仅记录）
    const logout = await page.evaluate(async (fallbackSessionId) => {
      const m = document.cookie.match(/(?:^|;\s*)sessionid=([^;]+)/);
      const sessionid = m ? decodeURIComponent(m[1]) : fallbackSessionId;
      const res = await fetch('/logout', {
        method: 'POST',
        body: new URLSearchParams({ sessionid }),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'include'
      });
      return { status: res.status };
    }, sessionId).catch((err) => ({ status: 0, error: err.message }));
    log.info(`[OfflineAccount] web logout 响应: status=${logout.status}${logout.error ? ` error=${logout.error}` : ''}`);
  } finally {
    await browser.close().catch(() => {});
  }
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
   * 注销 Steam 账号（在所有设备退出登录）—— Playwright 方案（同根目录 flush_playwright.js）：
   * steamcommunity 登录拿鉴权 cookie → 注入真实浏览器 → 打开授权设备页让 Akamai JS 跑完
   * → 页面内 fetch manage_action(action=deauthorize) 反授权所有设备 → 登出 web 会话。
   * 仅账号来源为 offline_game_account。
   */
  async logout(id) {
    const accountInfo = await db('offline_game_account').where('id', id).first();
    if (!accountInfo) throw new AppError('账号不存在');
    if (!accountInfo.password) throw new AppError('账号密码不存在');
    if (!accountInfo.code) throw new AppError('账号缺少动态码(shared_secret)，无法注销');

    // 串行执行：每次注销都要启动一个真实浏览器，避免并发耗尽资源
    const task = logoutQueue.then(() => deauthorizeAllDevicesViaBrowser({
      accountName: accountInfo.account,
      password: accountInfo.password,
      sharedSecret: accountInfo.code
    }));
    logoutQueue = task.catch(() => {});

    try {
      await task;
    } catch (err) {
      log.error(`[OfflineAccount] 注销失败(id=${id}, account=${accountInfo.account}): ${err.message}`);
      throw new AppError(`STEAM注销失败,请重试（原因：${err.message}）`);
    }
    log.info(`[OfflineAccount] 已注销(反授权所有设备+登出): ${accountInfo.account} (id=${id})`);
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
