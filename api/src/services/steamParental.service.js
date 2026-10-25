import crypto from 'crypto';
import { createRequire } from 'module';
import SteamUser from 'steam-user';
import SteamTotp from 'steam-totp';
import { log } from '../utils/logger.js';
import { AppError } from '../middlewares/error.middleware.js';
import { OfflineGameAccountModel } from '../models/offlineGameAccount.model.js';

const require = createRequire(import.meta.url);

// steam-user bundles the Parental protobuf schemas, but does NOT register the
// "Parental.*" service methods in its internal unified-message dictionary and
// exposes no public sendUnifiedMessage(). We therefore encode/decode the
// Parental messages ourselves and push them through the low-level client._send.
const Schema = require('steam-user/protobufs/generated/_load.js');
const EMsg = require('steam-user/enums/EMsg.js');

const accountModel = new OfflineGameAccountModel();

/**
 * Feature restriction bitmask written into ParentalSettings.enabled_features
 * when ENABLING parental control on an account that has no existing config.
 *
 * IMPORTANT: this is the Steam BACKEND EParentalFeature enum (protobuf), which
 * is NOT bundled with steam-user and whose exact values could not be verified
 * from an accessible authoritative source. It is intentionally left at 0, which
 * means "do not invent a restriction set" — the toggle then only flips the
 * is_enabled flag and preserves whatever restriction config the account already
 * has. Set this to the correct backend bitmask once confirmed; guessing risks
 * locking the game library and bricking rental accounts.
 */
const ENABLE_FEATURE_MASK = 0;

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

// ==================== Steam login (CM only) ====================

/**
 * Log an account into the Steam CM and resolve with the SteamUser client.
 * Resolves on `loggedOn` (does NOT wait for webSession/community, which the
 * Parental service does not need).
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
    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      fn(arg);
    };

    user.on('loggedOn', () => {
      const steamid = user.steamID ? user.steamID.toString() : '';
      logFn(`Steam 登录成功 (SteamID: ${steamid})`);
      done(resolve, user);
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

// ==================== Parental unified-message helper ====================

/**
 * Send a Parental.* unified message through steam-user's low-level _send and
 * decode the raw response buffer ourselves (steam-user does not register these
 * response protos, so the response body arrives undecoded).
 */
function sendParentalUnified(client, methodName, reqSchemaName, respSchemaName, data, logFn) {
  return new Promise((resolve, reject) => {
    const ReqType = Schema[reqSchemaName];
    const RespType = Schema[respSchemaName];
    if (!ReqType || !RespType) {
      return reject(new Error(`缺少 Parental protobuf schema: ${reqSchemaName}/${respSchemaName}`));
    }

    let encoded;
    try {
      encoded = Buffer.from(ReqType.encode(data || {}).finish());
    } catch (e) {
      return reject(new Error(`编码 ${reqSchemaName} 失败: ${e.message}`));
    }

    const header = {
      msg: EMsg.ServiceMethodCallFromClient,
      proto: { target_job_name: `Parental.${methodName}#1` }
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
          const resp = buf.length ? RespType.toObject(RespType.decode(buf), { defaults: true, longs: String, enums: Number }) : {};
          resolve(resp);
        } catch (e) {
          reject(new Error(`解码 ${respSchemaName} 失败: ${e.message}`));
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

// ==================== Toggle orchestration ====================

async function runToggle(jobId, accountId, proxy) {
  const logFn = (msg, type = 'info') => pushLog(jobId, msg, type);
  let client = null;
  try {
    const account = await accountModel.findById(accountId);
    if (!account) throw new Error('账号不存在');
    if (!account.account || !account.password) {
      throw new Error('账号缺少账号名或密码，无法登录 Steam');
    }

    logFn(`准备账号 ${account.account}`);
    client = await loginClient(
      { username: account.account, password: account.password, shared_secret: account.code || '' },
      logFn,
      proxy
    );

    logFn('读取当前家长控制状态...');
    const cur = await sendParentalUnified(
      client,
      'GetParentalSettings',
      'CParental_GetParentalSettings_Request',
      'CParental_GetParentalSettings_Response',
      {},
      logFn
    );
    const settings = (cur && cur.settings) || {};
    const isEnabled = !!settings.is_enabled;
    logFn(`当前状态：${isEnabled ? '已启用' : '未启用'}`);

    if (isEnabled) {
      logFn('正在关闭家长控制...');
      await sendParentalUnified(
        client,
        'DisableParentalSettings',
        'CParental_DisableParentalSettings_Request',
        'CParental_DisableParentalSettings_Response',
        {},
        logFn
      );
      logFn('已关闭家长控制', 'success');
      finishJob(jobId, 'success', { action: 'disable', account: account.account });
    } else {
      // Preserve the account's own restriction config; only flip is_enabled.
      const next = Object.assign({}, settings);
      delete next.steamid;
      next.is_enabled = true;
      if (ENABLE_FEATURE_MASK > 0) {
        next.enabled_features = ENABLE_FEATURE_MASK;
      } else {
        logFn('未配置功能限制位掩码(enabled_features)，本次仅切换启用状态、沿用账号已有限制配置', 'warn');
      }
      logFn('正在启用家长控制...');
      await sendParentalUnified(
        client,
        'EnableParentalSettings',
        'CParental_EnableParentalSettings_Request',
        'CParental_EnableParentalSettings_Response',
        { settings: next },
        logFn
      );
      logFn('已启用家长控制', 'success');
      finishJob(jobId, 'success', { action: 'enable', account: account.account });
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
   * Start an async enable/disable toggle job for one offline account.
   * Auto-detects the current state and flips it.
   * @returns {{ jobId: string }}
   */
  async startToggle(accountId, proxy = null) {
    const id = Number(accountId);
    if (!id) throw new AppError('账号ID无效', 400);

    const account = await accountModel.findById(id);
    if (!account) throw new AppError('账号不存在', 404);
    if (!account.account || !account.password) {
      throw new AppError('账号缺少账号名或密码，无法登录 Steam', 400);
    }

    const jobId = crypto.randomUUID();
    createJob(jobId);
    pushLog(jobId, '===== 开始切换家长控制 =====');

    // Fire and forget; the frontend polls getStatus(jobId).
    runToggle(jobId, id, proxy).catch((err) => {
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
