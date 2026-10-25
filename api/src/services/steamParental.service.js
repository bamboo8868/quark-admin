import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import axios from 'axios';
import protobuf from 'protobufjs';
import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import { log } from '../utils/logger.js';
import { AppError } from '../middlewares/error.middleware.js';
import { OfflineGameAccountModel } from '../models/offlineGameAccount.model.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Family-group queries go through the HTTPS WebAPI (same proven path as
// steamFamily.service.js). Parental.* stays on the CM unified-message channel.
const BASE_URL = 'https://api.steampowered.com';
const WEB_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0';

// steam-user does NOT register the "Parental.*" service methods in its internal
// unified-message dictionary and exposes no public sendUnifiedMessage(). We
// encode/decode all messages ourselves from the project's steam.proto and push
// Parental.* through the low-level client._send (CM unified-message channel).
const EMsg = require('steam-user/enums/EMsg.js');

// Both the FamilyGroups.* (WebAPI) and Parental.* (CM unified) messages are
// defined in the project's own steam.proto (package steam.request).
const PROTO_PATH = path.join(__dirname, '../config/steam.proto');

const accountModel = new OfflineGameAccountModel();

/**
 * Feature restriction bitmask written into ParentalSettings.enabled_features
 * when ENABLING parental control for a child that has no existing config.
 *
 * IMPORTANT: this is the Steam BACKEND EParentalFeature enum (protobuf), which
 * is NOT bundled with steam-user and whose exact values could not be verified
 * from an accessible authoritative source. It is intentionally left at 0, which
 * means "do not invent a restriction set" — enabling then only flips is_enabled
 * and preserves whatever restriction config the child already has. Set this to
 * the correct backend bitmask once confirmed; guessing risks locking the game
 * library and bricking accounts.
 */
const ENABLE_FEATURE_MASK = 0;

const CHILD_ROLE = 2; // EFamilyGroupRole.k_EFamilyGroupRole_Child

const LOGIN_TIMEOUT_MS = 60 * 1000;
const CALL_TIMEOUT_MS = 20 * 1000;
const JOB_TTL_MS = 30 * 60 * 1000; // keep finished jobs for 30 minutes

// ==================== In-memory job store ====================

const jobs = new Map();

function reapExpiredJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (job.finishedAt && now - job.finishedAt > JOB_TTL_MS) jobs.delete(id);
  }
}

function createJob(jobId) {
  const job = {
    jobId,
    status: 'running', // running | success | failed
    logs: [],
    result: null,
    createdAt: Date.now(),
    finishedAt: null
  };
  jobs.set(jobId, job);
  reapExpiredJobs();
  return job;
}

function pushLog(jobId, msg, type = 'info') {
  const job = jobs.get(jobId);
  if (!job) return;
  job.logs.push({ time: new Date().toISOString(), msg, type });
  log.info(`[SteamParental][${jobId}] ${msg}`);
}

function finishJob(jobId, status, result) {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = status;
  job.result = result || null;
  job.finishedAt = Date.now();
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

// ==================== protobuf codecs ====================

let _root = null;
async function getRoot() {
  if (!_root) {
    // keepCase:true preserves the proto's snake_case field names (is_enabled,
    // family_groupid, include_family_group_response, ...) so the request and
    // response objects used in this service match steam.proto verbatim. Without
    // it protobufjs camelCases every field and our snake_case keys are dropped.
    const src = fs.readFileSync(PROTO_PATH, 'utf8');
    _root = protobuf.parse(src, { keepCase: true }).root;
  }
  return _root;
}

// All Parental.* and FamilyGroups.* types come from the project's steam.proto
// (package steam.request) — a single source of truth for both channels.
async function protoCodec(reqName, respName) {
  const root = await getRoot();
  const Req = root.lookupType('steam.request.' + reqName);
  const Resp = root.lookupType('steam.request.' + respName);
  return {
    encode: (data) => Req.encode(Req.create(data)).finish(),
    decode: (buf) =>
      buf.length
        ? Resp.toObject(Resp.decode(buf), { defaults: true, longs: String, enums: Number, bytes: String })
        : {}
  };
}

// ==================== Low-level unified-message send ====================

/**
 * Send a "<Service>.<Method>#1" unified message through steam-user's _send and
 * decode the raw response ourselves (steam-user does not register these protos,
 * so the response body arrives undecoded). Rejects on a non-OK EResult.
 */
function sendUnified(client, serviceName, methodName, encodeFn, decodeFn, data) {
  return new Promise((resolve, reject) => {
    let encoded;
    try {
      encoded = Buffer.from(encodeFn(data || {}));
    } catch (e) {
      return reject(new Error(`编码 ${serviceName}.${methodName} 请求失败: ${e.message}`));
    }

    const header = {
      msg: EMsg.ServiceMethodCallFromClient,
      proto: { target_job_name: `${serviceName}.${methodName}#1` }
    };

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`${methodName} 响应超时`));
    }, CALL_TIMEOUT_MS);

    try {
      client._send(header, encoded, (body, hdr) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);

        const eresult = hdr && hdr.proto ? hdr.proto.eresult : undefined;
        if (eresult !== undefined && eresult !== null && eresult !== 1) {
          const name = SteamUser.EResult[eresult] || eresult;
          return reject(new Error(`${methodName} 失败 (EResult ${eresult}: ${name})`));
        }

        try {
          let buf = body;
          if (buf && typeof buf.toBuffer === 'function') buf = buf.toBuffer();
          if (!Buffer.isBuffer(buf)) buf = buf && buf.length !== undefined ? Buffer.from(buf) : Buffer.alloc(0);
          resolve(decodeFn(buf));
        } catch (e) {
          reject(new Error(`解码 ${serviceName}.${methodName} 响应失败: ${e.message}`));
        }
      });
    } catch (e) {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(new Error(`发送 ${methodName} 失败: ${e.message}`));
      }
    }
  });
}

async function callParental(client, methodName, reqName, respName, data) {
  const c = await protoCodec(reqName, respName);
  return sendUnified(client, 'Parental', methodName, c.encode, c.decode, data);
}

/**
 * Query the adult's family group through the IFamilyGroupsService WebAPI.
 * The CM unified-message channel returns an empty body for FamilyGroups, so we
 * use the same HTTPS protobuf WebAPI path proven in steamFamily.service.js.
 */
async function getFamilyGroupForUserWeb(accessToken, steamid, proxy) {
  const c = await protoCodec(
    'CFamilyGroups_GetFamilyGroupForUser_Request',
    'CFamilyGroups_GetFamilyGroupForUser_Response'
  );
  const reqBuf = Buffer.from(c.encode({ steamid, include_family_group_response: true }));
  const base64Body = reqBuf.toString('base64');
  const url =
    `${BASE_URL}/IFamilyGroupsService/GetFamilyGroupForUser/v1` +
    `?access_token=${accessToken}&input_protobuf_encoded=${encodeURIComponent(base64Body)}`;

  const axiosConfig = {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': WEB_UA }
  };
  if (proxy && proxy.host) {
    axiosConfig.proxy = {
      protocol: proxy.protocol || 'http',
      host: proxy.host,
      port: parseInt(proxy.port) || 10808
    };
  }
  const res = await axios.get(url, axiosConfig);
  return c.decode(Buffer.from(res.data));
}

// ==================== Steam login (CM only) ====================

/**
 * Log an account into the Steam CM and resolve with { client, accessToken, steamid }.
 * Waits for `webSession` (not just `loggedOn`) because the family-group query
 * needs the WebAPI access_token carried in the steamLoginSecure cookie. The CM
 * session stays logged in, so Parental.* unified messages still work on `client`.
 */
function loginClient(account, logFn, proxy) {
  return new Promise((resolve, reject) => {
    const user = new SteamUser({
      autoRelogin: false,
      machineName: `quark-parental-${account.username}`
    });

    if (proxy && proxy.host) {
      const { protocol, host, port } = proxy;
      if (protocol === 'socks5' || protocol === 'socks4') {
        user.setOption('socksProxy', `${protocol}://${host}:${port}`);
      } else {
        user.setOption('httpProxy', `http://${host}:${port}`);
      }
    }

    let settled = false;
    let cmSteamId = '';
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };

    user.on('loggedOn', () => {
      cmSteamId = user.steamID ? user.steamID.getSteamID64() : '';
      logFn(`Steam CM 登录成功 (SteamID: ${cmSteamId})`);
    });

    user.on('webSession', (sessionID, cookies) => {
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
        logFn('获取 access_token 成功（用于家庭组 WebAPI）');
        done(resolve, {
          client: user,
          accessToken,
          steamid: cmSteamId || (user.steamID ? user.steamID.getSteamID64() : '')
        });
      } else {
        logFn('未从 cookies 找到 access_token，尝试 webLogOn...');
        try {
          user.webLogOn();
        } catch (_) {
          /* ignore */
        }
      }
    });

    user.on('steamGuard', (domain, callback, lastCodeWrong) => {
      if (!account.shared_secret) {
        return done(reject, new Error('账号缺少动态码(shared_secret)，无法通过 Steam Guard 验证'));
      }
      const gen = () => {
        try {
          const code = SteamTotp.generateAuthCode(account.shared_secret);
          logFn(`使用 shared_secret 生成验证码: ${code}`);
          callback(code);
        } catch (e) {
          done(reject, new Error(`生成验证码失败: ${e.message}`));
        }
      };
      if (lastCodeWrong) {
        logFn('上次验证码错误，等待 30 秒后重新生成...');
        setTimeout(gen, 30000);
      } else {
        gen();
      }
    });

    user.on('error', (err) => {
      const name =
        err.eresult !== undefined && SteamUser.EResult[err.eresult]
          ? ` (EResult ${err.eresult}: ${SteamUser.EResult[err.eresult]})`
          : '';
      done(reject, new Error(`登录失败: ${err.message}${name}`));
    });

    const loginDetails = { accountName: account.username, password: account.password };
    if (account.shared_secret) {
      try {
        loginDetails.twoFactorCode = SteamTotp.generateAuthCode(account.shared_secret);
      } catch (_) {
        /* steamGuard handler will regenerate */
      }
    }

    try {
      user.logOn(loginDetails);
    } catch (e) {
      done(reject, e);
    }

    setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          user.logOff();
        } catch (_) {
          /* ignore */
        }
        reject(new Error(`账号 ${account.username} 登录超时`));
      }
    }, LOGIN_TIMEOUT_MS);
  });
}

// ==================== Orchestration ====================

/**
 * Log in as the adult account, find the child members of its family group, and
 * enable or disable parental control for each child.
 */
async function runParentalAction(jobId, accountId, action, proxy) {
  const logFn = (msg, type = 'info') => pushLog(jobId, msg, type);
  const verb = action === 'disable' ? '关闭' : '启用';
  let client = null;
  try {
    const account = await accountModel.findById(accountId);
    if (!account) throw new Error('账号不存在');
    if (!account.account || !account.password) {
      throw new Error('账号缺少账号名或密码，无法登录 Steam');
    }

    logFn(`准备成人账号 ${account.account}，动作：${verb}家长控制`);
    const session = await loginClient(
      { username: account.account, password: account.password, shared_secret: account.code || '' },
      logFn,
      proxy
    );
    client = session.client;
    const accessToken = session.accessToken;
    const adultSteamId = session.steamid || (client.steamID ? client.steamID.getSteamID64() : '');
    if (!adultSteamId) throw new Error('无法获取成人账号 SteamID');
    if (!accessToken) throw new Error('未获取到 access_token，无法查询家庭组');

    logFn('通过 WebAPI 查询该成人所在家庭组...');
    const fam = await getFamilyGroupForUserWeb(accessToken, adultSteamId, proxy);
    logFn(`家庭组原始响应: ${JSON.stringify(fam)}`);

    const familyGroupId = fam && fam.family_groupid ? String(fam.family_groupid) : '';
    if (fam && fam.is_not_member_of_any_group) {
      throw new Error('该成人账号不在任何家庭组中');
    }
    if (!familyGroupId || familyGroupId === '0') {
      throw new Error('未获取到该成人账号的家庭组');
    }

    const members = (fam.family_group && fam.family_group.members) || [];
    const children = members.filter((m) => Number(m.role) === CHILD_ROLE);
    logFn(`家庭组 ${familyGroupId}（${fam.family_group ? fam.family_group.name || '' : ''}）成员 ${members.length} 人，其中儿童 ${children.length} 人`);

    if (children.length === 0) {
      throw new Error('该家庭组下没有儿童账号');
    }

    let okCount = 0;
    let failCount = 0;
    for (const child of children) {
      const childId = String(child.steamid);
      try {
        if (action === 'disable') {
          await callParental(client, 'DisableParentalSettings', 'CParental_DisableParentalSettings_Request', 'CParental_DisableParentalSettings_Response', { steamid: childId });
          logFn(`儿童 ${childId} 已关闭家长控制`, 'success');
        } else {
          // Preserve the child's own restriction config if readable; only flip is_enabled.
          let settings = {};
          try {
            const cur = await callParental(client, 'GetParentalSettings', 'CParental_GetParentalSettings_Request', 'CParental_GetParentalSettings_Response', { steamid: childId });
            settings = (cur && cur.settings) || {};
          } catch (e) {
            logFn(`读取儿童 ${childId} 现状失败（${e.message}），将用默认设置启用`, 'warn');
          }
          const next = Object.assign({}, settings);
          delete next.steamid;
          next.is_enabled = true;
          if (ENABLE_FEATURE_MASK > 0) {
            next.enabled_features = ENABLE_FEATURE_MASK;
          }
          await callParental(client, 'EnableParentalSettings', 'CParental_EnableParentalSettings_Request', 'CParental_EnableParentalSettings_Response', { settings: next, steamid: childId });
          logFn(`儿童 ${childId} 已启用家长控制`, 'success');
        }
        okCount++;
      } catch (e) {
        failCount++;
        logFn(`儿童 ${childId} ${verb}失败: ${e.message}`, 'error');
      }
    }

    if (okCount === 0) {
      finishJob(jobId, 'failed', { action, error: `所有儿童账号${verb}失败`, failCount });
    } else {
      logFn(`完成：成功 ${okCount} 个，失败 ${failCount} 个`, failCount ? 'warn' : 'success');
      finishJob(jobId, 'success', { action, okCount, failCount, total: children.length });
    }
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    logFn(`操作失败: ${msg}`, 'error');
    finishJob(jobId, 'failed', { error: msg });
  } finally {
    if (client) {
      try {
        client.logOff();
      } catch (_) {
        /* ignore */
      }
    }
  }
}

// ==================== Public API ====================

export const steamParentalService = {
  /**
   * Start an async enable/disable job for the CHILD accounts of the family
   * group owned by the given adult offline account.
   * @param {number} accountId adult offline account id
   * @param {'enable'|'disable'} action
   * @returns {Promise<{ jobId: string }>}
   */
  async startAction(accountId, action, proxy = null) {
    const id = Number(accountId);
    if (!id) throw new AppError('账号ID无效', 400);
    if (action !== 'enable' && action !== 'disable') {
      throw new AppError('动作无效（仅支持 enable / disable）', 400);
    }

    const account = await accountModel.findById(id);
    if (!account) throw new AppError('账号不存在', 404);
    if (!account.account || !account.password) {
      throw new AppError('账号缺少账号名或密码，无法登录 Steam', 400);
    }

    const jobId = crypto.randomUUID();
    createJob(jobId);
    pushLog(jobId, `===== 开始${action === 'disable' ? '关闭' : '启用'}家庭组儿童家长控制 =====`);

    // Fire and forget; the frontend polls getStatus(jobId).
    runParentalAction(jobId, id, action, proxy).catch((err) => {
      pushLog(jobId, `任务异常: ${err && err.message ? err.message : err}`, 'error');
      finishJob(jobId, 'failed', { error: (err && err.message) || '未知异常' });
    });

    return { jobId };
  },

  /**
   * Poll a running/finished job.
   */
  getStatus(jobId) {
    const job = getJob(jobId);
    if (!job) return null;
    return {
      jobId: job.jobId,
      status: job.status,
      logs: job.logs,
      result: job.result,
      createdAt: job.createdAt,
      finishedAt: job.finishedAt
    };
  }
};

export default steamParentalService;
