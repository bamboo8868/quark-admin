/**
 * Steam Family Group service.
 *
 * Server-side port of the `steam_family_client` Electron app. It reproduces the
 * "组建家庭组" flow:
 *   1. Log in a primary account + up to 5 family accounts (steam-user + shared_secret 2FA)
 *   2. Primary adds every family account as a friend; family accounts auto-accept
 *   3. Check whether the primary already owns a family group
 *   4. Create the family group if missing (protobuf WebAPI)
 *   5. Invite every family account (adult / child role)
 *   6. Each family account joins and auto-approves the Steam Guard confirmation
 *      (requires identity_secret)
 *
 * The flow is long-running (multiple logins + friend polling), so it runs as an
 * in-process async job. Logs/status are kept in an in-memory job store and polled
 * by the admin frontend. (PM2 runs quark-api in fork mode with a single instance,
 * so the steam-user sessions and the job store live in the same process.)
 */

import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import axios from 'axios';
import FormData from 'form-data';
import protobuf from 'protobufjs';
import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import { log } from '../utils/logger.js';
import { AppError } from '../middlewares/error.middleware.js';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://api.steampowered.com';
const PROTO_PATH = path.join(__dirname, '../config/steam.proto');
const MAX_FAMILY_ACCOUNTS = 5;
const JOB_TTL_MS = 30 * 60 * 1000; // keep finished jobs for 30 minutes

// ==================== protobuf helpers ====================

let _root = null;

async function getRoot() {
  if (!_root) {
    _root = await protobuf.load(PROTO_PATH);
  }
  return _root;
}

async function encodeMessage(typeName, data) {
  const root = await getRoot();
  const MsgType = root.lookupType('steam.request.' + typeName);
  const msg = MsgType.create(data);
  const buffer = MsgType.encode(msg).finish();
  return protobuf.util.base64.encode(buffer, 0, buffer.length);
}

async function decodeMessage(typeName, buffer) {
  const root = await getRoot();
  const MsgType = root.lookupType('steam.request.' + typeName);
  const msg = MsgType.decode(buffer);
  return MsgType.toObject(msg, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: true
  });
}

// ==================== SteamFamilyApiClient ====================

/**
 * Thin protobuf client over the IFamilyGroupsService WebAPI.
 */
class SteamFamilyApiClient {
  constructor(proxy) {
    this.proxy = proxy || null;
    const axiosConfig = {
      baseURL: BASE_URL,
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0'
      }
    };
    if (this.proxy && this.proxy.host) {
      axiosConfig.proxy = {
        protocol: this.proxy.protocol || 'http',
        host: this.proxy.host,
        port: parseInt(this.proxy.port) || 10808
      };
    }
    this.http = axios.create(axiosConfig);
  }

  async _post(apiPath, requestType, data, accessToken) {
    const base64Body = await encodeMessage(requestType, data);
    const url = `${apiPath}?access_token=${accessToken}`;
    const formData = new FormData();
    formData.append('input_protobuf_encoded', base64Body);
    const res = await this.http.post(url, formData, { headers: formData.getHeaders() });
    const responseType = requestType.replace('_Request', '_Response');
    return await decodeMessage(responseType, res.data);
  }

  async _get(apiPath, requestType, data, accessToken) {
    const base64Body = await encodeMessage(requestType, data);
    const url = `${apiPath}?access_token=${accessToken}&input_protobuf_encoded=${encodeURIComponent(base64Body)}`;
    const res = await this.http.get(url);
    const responseType = requestType.replace('_Request', '_Response');
    return await decodeMessage(responseType, res.data);
  }

  createFamilyGroup(data, accessToken) {
    return this._post('/IFamilyGroupsService/CreateFamilyGroup/v1', 'CFamilyGroups_CreateFamilyGroup_Request', data, accessToken);
  }

  getFamilyGroupForUser(data, accessToken) {
    return this._get('/IFamilyGroupsService/GetFamilyGroupForUser/v1', 'CFamilyGroups_GetFamilyGroupForUser_Request', data, accessToken);
  }

  getFamilyGroup(data, accessToken) {
    return this._get('/IFamilyGroupsService/GetFamilyGroup/v1', 'CFamilyGroups_GetFamilyGroup_Request', data, accessToken);
  }

  inviteToFamilyGroup(data, accessToken) {
    return this._post('/IFamilyGroupsService/InviteToFamilyGroup/v1', 'CFamilyGroups_InviteToFamilyGroup_Request', data, accessToken);
  }

  joinFamilyGroup(data, accessToken) {
    return this._post('/IFamilyGroupsService/JoinFamilyGroup/v1', 'CFamilyGroups_JoinFamilyGroup_Request', data, accessToken);
  }
}

// ==================== SteamFamilyLoginManager ====================

/**
 * Manages steam-user sessions keyed by account name. Non-interactive: 2FA codes
 * come from each account's shared_secret, and mobile confirmations are approved
 * with each account's identity_secret.
 *
 * account shape: { username, password, shared_secret, identity_secret }
 */
class SteamFamilyLoginManager {
  constructor(proxy) {
    this.proxy = proxy || null;
    this.users = new Map();          // username -> SteamUser
    this.accounts = new Map();       // username -> account payload
    this.accessTokens = new Map();   // username -> access_token
    this.steamIds = new Map();       // username -> steamid
    this.webCookies = new Map();     // username -> cookies[]
    this.friendsListLoaded = new Set();
    this.friendsListWaiters = new Map();
    this.autoAcceptAccounts = new Set();
    this.autoAcceptWhitelist = new Set();
    this.logCallback = null;
  }

  setLogCallback(cb) {
    this.logCallback = cb;
  }

  _log(accountName, msg) {
    if (this.logCallback) this.logCallback(accountName, msg);
  }

  _applyProxy(user) {
    if (!this.proxy || !this.proxy.host) return;
    const { protocol, host, port } = this.proxy;
    if (protocol === 'socks5' || protocol === 'socks4') {
      user.setOption('socksProxy', `${protocol}://${host}:${port}`);
    } else {
      user.setOption('httpProxy', `http://${host}:${port}`);
    }
  }

  /**
   * Log in one account and resolve with { steamid, accessToken }.
   */
  login(account) {
    const accountName = account.username;
    return new Promise((resolve, reject) => {
      if (this.users.has(accountName)) {
        try { this.users.get(accountName).logOff(); } catch (_) { /* ignore */ }
        this.users.delete(accountName);
      }

      this.accounts.set(accountName, account);
      const user = new SteamUser({ autoRelogin: false, machineName: `quark-family-${accountName}` });
      this.users.set(accountName, user);
      this._applyProxy(user);

      const settled = { value: false };
      const done = (fn, arg) => {
        if (settled.value) return;
        settled.value = true;
        fn(arg);
      };

      user.on('loggedOn', () => {
        const steamid = user.steamID ? user.steamID.toString() : '';
        this.steamIds.set(accountName, steamid);
        this._log(accountName, 'Steam 连接成功');
      });

      user.on('friendsList', () => {
        this.friendsListLoaded.add(accountName);
        const waiters = this.friendsListWaiters.get(accountName);
        if (waiters) {
          this.friendsListWaiters.delete(accountName);
          for (const cb of waiters) cb();
        }
      });

      user.on('webSession', (sessionID, cookies) => {
        this.webCookies.set(accountName, cookies);
        let accessToken = '';
        for (const cookie of cookies) {
          if (cookie.includes('steamLoginSecure')) {
            const match = cookie.match(/steamLoginSecure=([^;]+)/);
            if (match) {
              const parts = decodeURIComponent(match[1]).split('||');
              if (parts.length >= 2) accessToken = parts[1];
            }
          }
        }
        if (accessToken) {
          this.accessTokens.set(accountName, accessToken);
          this._log(accountName, '获取 access_token 成功');
          done(resolve, { steamid: this.steamIds.get(accountName) || '', accessToken });
        } else {
          this._log(accountName, '未从 cookies 中找到 access_token，尝试 webLogOn');
          user.webLogOn();
        }
      });

      user.on('steamGuard', (domain, callback, lastCodeWrong) => {
        if (account.shared_secret) {
          const gen = () => {
            try {
              const code = SteamTotp.generateAuthCode(account.shared_secret);
              this._log(accountName, `使用 shared_secret 生成验证码: ${code}`);
              callback(code);
            } catch (e) {
              done(reject, new Error(`生成验证码失败: ${e.message}`));
            }
          };
          if (lastCodeWrong) {
            this._log(accountName, '上次验证码错误，等待 30 秒后重新生成...');
            setTimeout(gen, 30000);
          } else {
            gen();
          }
        } else {
          done(reject, new Error('账号缺少 shared_secret，无法通过 Steam Guard 验证'));
        }
      });

      user.on('error', (err) => {
        const name = err.eresult !== undefined && SteamUser.EResult[err.eresult]
          ? ` (EResult: ${SteamUser.EResult[err.eresult]})` : '';
        this._log(accountName, `登录错误: ${err.message}${name}`);
        done(reject, err);
      });

      user.on('disconnected', (eresult, msg) => {
        this._log(accountName, `连接断开: ${eresult} ${msg || ''}`);
      });

      // Auto-accept incoming friend requests for whitelisted senders
      const EFriendRelationship = require$steamEnums();
      user.on('friendRelationship', (sid, relationship) => {
        if (!this.autoAcceptAccounts.has(accountName)) return;
        const targetSteamId = sid.toString();
        if (relationship === EFriendRelationship.RequestRecipient) {
          if (this.autoAcceptWhitelist.size > 0 && !this.autoAcceptWhitelist.has(targetSteamId)) return;
          this._log(accountName, `收到 ${targetSteamId} 的好友请求，自动接受`);
          user.addFriend(targetSteamId).catch((err) => {
            this._log(accountName, `接受 ${targetSteamId} 好友请求失败: ${err.message}`);
          });
        }
      });

      // Build login details
      const loginDetails = { accountName, password: account.password };
      if (account.shared_secret) {
        try {
          loginDetails.twoFactorCode = SteamTotp.generateAuthCode(account.shared_secret);
        } catch (_) { /* steamGuard handler will regenerate */ }
      }

      try {
        user.logOn(loginDetails);
      } catch (e) {
        done(reject, e);
      }

      setTimeout(() => {
        if (!settled.value) {
          settled.value = true;
          try { user.logOff(); } catch (_) { /* ignore */ }
          this.users.delete(accountName);
          reject(new Error(`账号 ${accountName} 登录超时`));
        }
      }, 60000);
    });
  }

  _waitForFriendsList(accountName, timeoutMs = 30000) {
    const user = this.users.get(accountName);
    if (!user) return Promise.resolve(false);
    if (this.friendsListLoaded.has(accountName)) return Promise.resolve(true);
    return new Promise((resolve) => {
      const resolveCb = () => { clearTimeout(timer); resolve(true); };
      const timer = setTimeout(() => {
        const waiters = this.friendsListWaiters.get(accountName);
        if (waiters) {
          const idx = waiters.indexOf(resolveCb);
          if (idx !== -1) waiters.splice(idx, 1);
          if (waiters.length === 0) this.friendsListWaiters.delete(accountName);
        }
        resolve(false);
      }, timeoutMs);
      if (!this.friendsListWaiters.has(accountName)) this.friendsListWaiters.set(accountName, []);
      this.friendsListWaiters.get(accountName).push(resolveCb);
    });
  }

  addFriend(fromAccountName, targetSteamId) {
    return new Promise((resolve) => {
      const user = this.users.get(fromAccountName);
      if (!user) return resolve({ success: false, error: `账号 ${fromAccountName} 未登录` });
      user.addFriend(targetSteamId, (err, personaName) => {
        if (err) {
          if (err.eresult === 14) {
            this._log(fromAccountName, `与 ${targetSteamId} 已经是好友或已发送请求`);
            resolve({ success: true });
          } else {
            this._log(fromAccountName, `添加好友 ${targetSteamId} 失败: ${err.message}`);
            resolve({ success: false, error: err.message });
          }
        } else {
          this._log(fromAccountName, `已向 ${targetSteamId} (${personaName || ''}) 发送好友请求`);
          resolve({ success: true });
        }
      });
      setTimeout(() => resolve({ success: false, error: '添加好友超时' }), 15000);
    });
  }

  async waitForFriend(accountName, targetSteamId, timeoutMs = 60000) {
    const user = this.users.get(accountName);
    if (!user) return false;
    const loaded = await this._waitForFriendsList(accountName, timeoutMs);
    if (!loaded) {
      this._log(accountName, '等待好友列表加载超时');
      return false;
    }
    const EFriendRelationship = require$steamEnums();
    if (user.myFriends && user.myFriends[targetSteamId] === EFriendRelationship.Friend) return true;
    return new Promise((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (user.myFriends && user.myFriends[targetSteamId] === EFriendRelationship.Friend) {
          this._log(accountName, `与 ${targetSteamId} 已成为好友`);
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - startTime > timeoutMs) {
          this._log(accountName, `等待与 ${targetSteamId} 成为好友超时`);
          clearInterval(interval);
          resolve(false);
        }
      }, 2000);
    });
  }

  enableAutoAcceptFriend(accountNames, whitelistSteamIds = []) {
    this.autoAcceptAccounts.clear();
    this.autoAcceptWhitelist.clear();
    for (const name of accountNames) this.autoAcceptAccounts.add(name);
    for (const sid of whitelistSteamIds) this.autoAcceptWhitelist.add(sid);
  }

  async acceptFriendRequest(accountName, targetSteamId, timeoutMs = 30000) {
    const user = this.users.get(accountName);
    if (!user) {
      this._log(accountName, '未登录，无法接受好友请求');
      return false;
    }
    const loaded = await this._waitForFriendsList(accountName, timeoutMs);
    if (!loaded) {
      this._log(accountName, '等待好友列表加载超时，无法接受好友请求');
      return false;
    }
    const EFriendRelationship = require$steamEnums();
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkAndAccept = () => {
        if (!user.myFriends) return false;
        const relationship = user.myFriends[targetSteamId];
        if (relationship === EFriendRelationship.Friend) return true;
        if (relationship === EFriendRelationship.RequestRecipient) {
          this._log(accountName, `发现 ${targetSteamId} 的好友请求，正在接受...`);
          user.addFriend(targetSteamId).then(() => resolve(true)).catch((err) => {
            this._log(accountName, `接受 ${targetSteamId} 好友请求失败: ${err.message}`);
            resolve(false);
          });
          return null;
        }
        return false;
      };
      const immediate = checkAndAccept();
      if (immediate === true) return resolve(true);
      if (immediate === null) return;
      const interval = setInterval(() => {
        const result = checkAndAccept();
        if (result === true) { clearInterval(interval); resolve(true); }
        else if (result === null) { clearInterval(interval); }
        else if (Date.now() - startTime > timeoutMs) {
          this._log(accountName, `等待 ${targetSteamId} 的好友请求超时`);
          clearInterval(interval);
          resolve(false);
        }
      }, 2000);
    });
  }

  /**
   * Approve the pending Steam Guard mobile confirmation (family-group join).
   * Returns true on success, 'no_secret' when identity_secret is missing, false on timeout.
   */
  async approveConfirmation(accountName, timeoutMs = 60000) {
    const account = this.accounts.get(accountName);
    const steamid = this.steamIds.get(accountName);
    const cookies = this.webCookies.get(accountName);
    if (!steamid || !cookies) {
      this._log(accountName, '缺少 steamid 或 cookies，无法确认令牌');
      return false;
    }
    if (!account || !account.identity_secret) {
      this._log(accountName, '未提供 identity_secret，请自行在手机/客户端确认加入家庭组');
      return 'no_secret';
    }

    const deviceId = `android:${steamid}-${Date.now()}`;
    const httpConfig = {
      baseURL: 'https://steamcommunity.com',
      timeout: 20000,
      headers: { Cookie: cookies.join('; ') }
    };
    if (this.proxy && this.proxy.host) {
      httpConfig.proxy = {
        protocol: this.proxy.protocol || 'http',
        host: this.proxy.host,
        port: parseInt(this.proxy.port) || 10808
      };
    }
    const http = axios.create(httpConfig);

    const startTime = Date.now();
    const pollInterval = 5000;
    this._log(accountName, '开始轮询 Steam Guard 确认列表...');

    while (Date.now() - startTime < timeoutMs) {
      try {
        const time = Math.floor(Date.now() / 1000);
        const confKey = SteamTotp.generateConfirmationKey(account.identity_secret, time, 'conf');
        const listRes = await http.get('/mobileconf/getlist', {
          params: { p: deviceId, a: steamid, k: confKey, t: time, tag: 'conf', m: 'android', l: 'english' }
        });
        if (listRes.data && listRes.data.success && listRes.data.conf) {
          const confs = listRes.data.conf;
          this._log(accountName, `获取到 ${confs.length} 个待确认项`);
          for (const conf of confs) {
            this._log(accountName, `确认项: [${conf.type_name}] ${conf.headline} (id: ${conf.id})`);
            const approveTime = Math.floor(Date.now() / 1000);
            const allowKey = SteamTotp.generateConfirmationKey(account.identity_secret, approveTime, 'allow');
            const approveRes = await http.get('/mobileconf/ajaxop', {
              params: {
                op: 'allow', p: deviceId, a: steamid, k: allowKey, t: approveTime,
                tag: 'allow', m: 'android', cid: conf.id, ck: conf.nonce
              }
            });
            if (approveRes.data && approveRes.data.success) {
              this._log(accountName, `已确认: [${conf.type_name}] ${conf.headline}`);
              return true;
            }
            this._log(accountName, `确认失败: ${JSON.stringify(approveRes.data)}`);
          }
        }
      } catch (err) {
        this._log(accountName, `轮询确认列表异常: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    this._log(accountName, '确认令牌超时');
    return false;
  }

  logOffAll() {
    for (const accountName of Array.from(this.users.keys())) {
      try { this.users.get(accountName).logOff(); } catch (_) { /* ignore */ }
    }
    this.users.clear();
    this.accessTokens.clear();
    this.steamIds.clear();
    this.webCookies.clear();
    this.friendsListLoaded.clear();
    this.autoAcceptAccounts.clear();
  }
}

// steam-user ships EFriendRelationship as a CommonJS enum module.
let _efr = null;
function require$steamEnums() {
  if (!_efr) {
    _efr = require('steam-user/enums/EFriendRelationship.js');
  }
  return _efr;
}

// ==================== Job store ====================

const jobs = new Map();

function createJob(jobId) {
  const job = { id: jobId, status: 'running', logs: [], result: null, createdAt: Date.now() };
  jobs.set(jobId, job);
  return job;
}

function pushLog(job, accountName, msg, type = 'info') {
  const now = new Date();
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0')).join(':');
  const prefix = accountName ? `[${accountName}] ` : '';
  job.logs.push({ time, msg: `${prefix}${msg}`, type });
}

function finishJob(job, status, result) {
  job.status = status;
  job.result = result || null;
  setTimeout(() => jobs.delete(job.id), JOB_TTL_MS);
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

// ==================== Orchestrator ====================

/**
 * Run the whole family-group creation flow for one job. Never throws; records
 * the outcome in the job store.
 */
async function runCreateFamilyGroupJob(job, payload) {
  const manager = new SteamFamilyLoginManager(payload.proxy);
  const client = new SteamFamilyApiClient(payload.proxy);

  manager.setLogCallback((accountName, msg) => {
    let type = 'info';
    if (/成功|已成为好友|已接受|已确认|已加入/.test(msg)) type = 'success';
    else if (/失败|错误|异常|超时/.test(msg)) type = 'error';
    else if (/验证码|需要|请自行/.test(msg)) type = 'warn';
    pushLog(job, accountName, msg, type);
  });

  const familyName = (payload.familyName && String(payload.familyName).trim()) || 'SteamFamily';

  try {
    pushLog(job, null, '===== 开始创建家庭组 =====', 'info');
    const primary = payload.primary;
    const familyList = Array.isArray(payload.family) ? payload.family : [];

    // ---------- Step 1: log in every account ----------
    pushLog(job, null, '--- 步骤1: 登录所有账号 ---', 'info');
    const all = [primary, ...familyList];
    for (const acc of all) {
      const label = acc === primary ? '主账号' : '家庭账号';
      try {
        const res = await manager.login(acc);
        acc.steamid = res.steamid;
        acc.accessToken = res.accessToken;
        pushLog(job, acc.username, `(${label}) 登录成功 (SteamID: ${res.steamid})`, 'success');
      } catch (err) {
        pushLog(job, acc.username, `(${label}) 登录失败: ${err.message}`, 'error');
        finishJob(job, 'failed', { error: `账号 ${acc.username} 登录失败: ${err.message}` });
        return;
      }
    }

    // ---------- Step 2: primary adds family accounts as friends ----------
    if (familyList.length > 0) {
      pushLog(job, null, '--- 步骤2: 主账号添加家庭账号为好友 ---', 'info');
      manager.enableAutoAcceptFriend(familyList.map((a) => a.username), [primary.steamid]);

      for (const acc of familyList) {
        pushLog(job, primary.username, `向 ${acc.username} (${acc.steamid}) 发送好友请求...`, 'info');
        await manager.addFriend(primary.username, acc.steamid);
      }

      pushLog(job, null, '家庭账号正在检查并接受好友请求...', 'info');
      let allAccepted = true;
      for (const acc of familyList) {
        const accepted = await manager.acceptFriendRequest(acc.username, primary.steamid, 30000);
        if (accepted) pushLog(job, acc.username, '已接受主账号好友请求', 'success');
        else { pushLog(job, acc.username, '接受好友请求失败', 'error'); allAccepted = false; }
      }
      if (!allAccepted) {
        finishJob(job, 'failed', { error: '并非所有家庭账号都接受了好友请求' });
        return;
      }

      pushLog(job, null, '确认所有好友关系已建立...', 'info');
      let allFriends = true;
      for (const acc of familyList) {
        const isFriend = await manager.waitForFriend(primary.username, acc.steamid, 30000);
        if (isFriend) pushLog(job, primary.username, `与 ${acc.username} 已成为好友`, 'success');
        else { pushLog(job, primary.username, `与 ${acc.username} 好友关系未建立`, 'error'); allFriends = false; }
      }
      if (!allFriends) {
        finishJob(job, 'failed', { error: '并非所有家庭账号都已成为好友' });
        return;
      }
    }

    // ---------- Step 3: does the primary already own a family group? ----------
    pushLog(job, null, '--- 步骤3: 检查主账号是否已有家庭组 ---', 'info');
    let familyGroupId = '';
    try {
      const info = await client.getFamilyGroupForUser(
        { steamid: primary.steamid, includeFamilyGroupResponse: false },
        primary.accessToken
      );
      if (info.isNotMemberOfAnyGroup === false && info.familyGroupid && info.familyGroupid !== '0') {
        familyGroupId = info.familyGroupid;
        pushLog(job, primary.username, `已有家庭组 (ID: ${familyGroupId})`, 'info');
      } else {
        pushLog(job, primary.username, '没有家庭组，需要创建', 'info');
      }
    } catch (err) {
      pushLog(job, primary.username, `检查家庭组状态异常: ${err.message}，将尝试创建`, 'warn');
    }

    // ---------- Step 4: create the family group ----------
    if (!familyGroupId) {
      pushLog(job, null, '--- 步骤4: 创建家庭组 ---', 'info');
      try {
        const createRes = await client.createFamilyGroup({ name: familyName }, primary.accessToken);
        familyGroupId = createRes.familyGroupid;
        if (familyGroupId && familyGroupId !== '0') {
          pushLog(job, primary.username, `家庭组创建成功 (ID: ${familyGroupId})`, 'success');
        } else {
          pushLog(job, primary.username, '家庭组创建返回无效 ID', 'error');
        }
      } catch (err) {
        pushLog(job, primary.username, `创建家庭组失败: ${err.message}`, 'error');
      }
    } else {
      pushLog(job, null, '--- 步骤4: 跳过创建（已有家庭组） ---', 'info');
    }

    if (!familyGroupId || familyGroupId === '0') {
      finishJob(job, 'failed', { error: '无法获取有效的家庭组 ID' });
      return;
    }

    // ---------- Step 5: invite family accounts ----------
    if (familyList.length > 0) {
      pushLog(job, null, '--- 步骤5: 邀请家庭账号加入家庭组 ---', 'info');
      for (const acc of familyList) {
        const roleNum = acc.type === 'adult' ? 1 : 2;
        pushLog(job, primary.username, `邀请 ${acc.username} (${acc.type === 'adult' ? '成人' : '儿童'}) 加入家庭组...`, 'info');
        try {
          const inviteRes = await client.inviteToFamilyGroup(
            { familyGroupid: familyGroupId, receiverSteamid: acc.steamid, receiverRole: roleNum },
            primary.accessToken
          );
          acc.inviteId = inviteRes.inviteId || '';
          pushLog(job, primary.username, `已邀请 ${acc.username} 加入家庭组 (invite_id: ${acc.inviteId || '-'})`, 'success');
        } catch (err) {
          pushLog(job, primary.username, `邀请 ${acc.username} 加入家庭组失败: ${err.message}`, 'error');
        }
      }
    }

    // ---------- Step 6: family accounts join + approve confirmation ----------
    let joinedCount = 0;
    if (familyList.length > 0) {
      pushLog(job, null, '--- 步骤6: 家庭账号确认加入家庭组 ---', 'info');
      for (const acc of familyList) {
        pushLog(job, acc.username, '正在确认加入家庭组...', 'info');
        try {
          const joinRes = await client.joinFamilyGroup({ familyGroupid: familyGroupId }, acc.accessToken);
          joinedCount++;
          pushLog(job, acc.username, `已加入家庭组${joinRes.inviteAlreadyAccepted ? ' (邀请已自动接受)' : ''}`, 'success');

          const twoFactorMethod = joinRes.twoFactorMethod;
          if (twoFactorMethod && twoFactorMethod !== '0' && twoFactorMethod !== 'k_ETwoFactorMethod_None') {
            pushLog(job, acc.username, `需要确认 Steam Guard 令牌 (method: ${twoFactorMethod})，正在自动确认...`, 'info');
            const confirmed = await manager.approveConfirmation(acc.username, 60000);
            if (confirmed === 'no_secret') pushLog(job, acc.username, '未提供 identity_secret，请自行确认加入家庭组', 'warn');
            else if (confirmed) pushLog(job, acc.username, 'Steam Guard 令牌已确认', 'success');
            else pushLog(job, acc.username, 'Steam Guard 令牌确认失败', 'error');
          }
        } catch (err) {
          pushLog(job, acc.username, `加入家庭组失败: ${err.message}`, 'error');
        }
      }
    }

    pushLog(job, null, '===== 家庭组创建流程结束 =====', 'info');
    finishJob(job, 'success', {
      familyGroupId,
      invited: familyList.length,
      joined: joinedCount
    });
  } catch (err) {
    log.error('[SteamFamily] job failed', err);
    pushLog(job, null, `流程异常: ${err.message}`, 'error');
    finishJob(job, 'failed', { error: err.message });
  } finally {
    manager.logOffAll();
  }
}

// ==================== Public service API ====================

export const steamFamilyService = {
  MAX_FAMILY_ACCOUNTS,

  /**
   * Validate the payload, register a job and kick off the async flow.
   * Returns the jobId immediately.
   */
  startCreate(payload = {}) {
    const primary = payload.primary || {};
    const family = Array.isArray(payload.family) ? payload.family : [];

    if (!primary.username || !primary.password) {
      throw new AppError('请填写主账号的用户名和密码');
    }
    if (family.length > MAX_FAMILY_ACCOUNTS) {
      throw new AppError(`家庭账号最多 ${MAX_FAMILY_ACCOUNTS} 个`);
    }
    const normalize = (acc, label) => {
      if (!acc.username || !acc.password) {
        throw new AppError(`${label} ${acc.username || ''} 缺少用户名或密码`);
      }
      return {
        username: String(acc.username).trim(),
        password: String(acc.password),
        shared_secret: String(acc.shared_secret || '').trim(),
        identity_secret: String(acc.identity_secret || '').trim(),
        type: acc.type === 'adult' ? 'adult' : 'child'
      };
    };

    const cleanPrimary = {
      username: String(primary.username).trim(),
      password: String(primary.password),
      shared_secret: String(primary.shared_secret || '').trim(),
      identity_secret: String(primary.identity_secret || '').trim()
    };
    const cleanFamily = family.map((acc, i) => normalize(acc, `家庭账号#${i + 1}`));

    const normalized = {
      primary: cleanPrimary,
      family: cleanFamily,
      familyName: payload.familyName || 'SteamFamily',
      proxy: payload.proxy && payload.proxy.host ? {
        protocol: payload.proxy.protocol || 'http',
        host: String(payload.proxy.host).trim(),
        port: parseInt(payload.proxy.port) || 10808
      } : null
    };

    const jobId = crypto.randomUUID();
    const job = createJob(jobId);
    pushLog(job, null, `任务已创建，共 ${cleanFamily.length} 个家庭账号`, 'info');

    // Fire and forget — the HTTP request returns immediately.
    runCreateFamilyGroupJob(job, normalized).catch((err) => {
      log.error('[SteamFamily] unexpected orchestrator crash', err);
      finishJob(job, 'failed', { error: err.message });
    });

    return { jobId };
  },

  /**
   * Read the current status + logs for a job.
   */
  getStatus(jobId) {
    const job = getJob(jobId);
    if (!job) return null;
    return { jobId: job.id, status: job.status, logs: job.logs, result: job.result };
  }
};

export default steamFamilyService;
