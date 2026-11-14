import SteamTotp from 'steam-totp';
import { getRedis } from '../config/redis.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { log } from '../utils/logger.js';
import { MemberGamesSimpleModel } from '../models/memberGamesSimple.model.js';

const memberGamesSimpleModel = new MemberGamesSimpleModel();

/**
 * Extract and verify web user token from Authorization header.
 * Returns { memberId, username } or null
 */
function getWebUser(request) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = verifyAccessToken(authHeader.substring(7));
    if (decoded.type !== 'web') return null;
    return { memberId: decoded.memberId, username: decoded.username };
  } catch {
    return null;
  }
}

// Verification-code (TOTP) refresh limits, scoped per member + per game row
const TOTP_DAILY_LIMIT = 3;        // max successful refreshes per day
const TOTP_COOLDOWN_SECONDS = 10;  // min seconds between two refreshes

/** Server-local date string (YYYYMMDD) used to scope daily Redis counter keys */
function localDateStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** Seconds remaining until the next server-local midnight (min 1) */
function secondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(1, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

/**
 * MemberGames Web Controller - 会员简易游戏库 (member_games_simple)
 * 列表以表格形式展示：游戏名称 / 游戏账号 / 密码 / 动态验证码
 */
export const memberGamesWebController = {
  /**
   * Get member games list (table data) with search + pagination.
   * POST /web/member-games
   * Auth: member token required (credentials are member-only).
   */
  getGames: async (request, reply) => {
    const user = getWebUser(request);
    if (!user) {
      return reply.code(401).send({ code: 401, message: '请先登录', data: null });
    }

    const body = request.body || {};
    const page = Math.max(1, parseInt(body.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(body.limit, 10) || 10));

    const data = await memberGamesSimpleModel.getGamesWithFilters(
      { name: body.name || '' },
      page,
      limit
    );

    return { code: 0, message: '操作成功', data };
  },

  /**
   * Refresh the Steam verification code (TOTP) for a member_games_simple row.
   * POST /web/member-games/totp
   * Body: { id }
   * Auth: member token required. Rate limit per (member, row):
   * at most TOTP_DAILY_LIMIT successful refreshes/day, >= TOTP_COOLDOWN_SECONDS apart.
   */
  refreshTotp: async (request, reply) => {
    const user = getWebUser(request);
    if (!user) {
      return reply.code(401).send({ code: 401, message: '请先登录', data: null });
    }

    const id = (request.body || {}).id;
    if (!id) {
      return { code: 10001, message: '游戏ID不能为空', data: null };
    }

    const row = await memberGamesSimpleModel.findById(id);
    if (!row || row.status !== 1) {
      return { code: 10002, message: '游戏不存在或已禁用', data: null };
    }
    if (!row.code) {
      return { code: 10006, message: '该游戏未配置密钥，无法生成验证码', data: null };
    }

    let totp_code = '';
    try {
      totp_code = SteamTotp.generateAuthCode(row.code);
    } catch (e) {
      totp_code = '';
    }
    if (!totp_code) {
      return { code: 10007, message: '验证码生成失败，请联系客服', data: null };
    }

    // Rate limit (Redis), scoped per member + row. Fail open on Redis outage.
    let remaining = TOTP_DAILY_LIMIT;
    try {
      const redis = getRedis();
      const cdKey = `membergames:totp:cd:${user.memberId}:${id}`;
      const dailyKey = `membergames:totp:daily:${user.memberId}:${id}:${localDateStr()}`;

      const cooling = await redis.get(cdKey);
      if (cooling) {
        const ttl = await redis.ttl(cdKey);
        const wait = ttl > 0 ? ttl : TOTP_COOLDOWN_SECONDS;
        return { code: 10008, message: `操作太频繁，请 ${wait} 秒后再试`, data: { cooldown: wait } };
      }

      await redis.set(cdKey, '1', 'EX', TOTP_COOLDOWN_SECONDS);
      const count = await redis.incr(dailyKey);
      if (count === 1) {
        await redis.expire(dailyKey, secondsUntilMidnight());
      }
      if (count > TOTP_DAILY_LIMIT) {
        return {
          code: 10009,
          message: `今日验证码刷新次数已用完（每天最多${TOTP_DAILY_LIMIT}次），请明天再试`,
          data: { remaining: 0 }
        };
      }
      remaining = TOTP_DAILY_LIMIT - count;
    } catch (err) {
      log.warn(`[MemberGamesWeb] totp limit check failed for member ${user.memberId} row ${id}: ${err.message}`);
    }

    return { code: 0, message: '操作成功', data: { totp_code, remaining } };
  }
};

export default memberGamesWebController;
