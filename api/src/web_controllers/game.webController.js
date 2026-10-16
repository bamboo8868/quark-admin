import db from '../utils/db.js';
import SteamTotp from 'steam-totp';
import { getRedis } from '../config/redis.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { log } from '../utils/logger.js';

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

// Verification-code (TOTP) refresh limits, scoped per member + per account
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
 * Deterministic 32-bit string hash (FNV-1a + MurmurHash3 fmix32 avalanche).
 * Same input always yields the same output, so it is safe for stable per-user
 * account assignment; the finalizer spreads nearby inputs across the full range
 * so HRW picking stays evenly balanced even when ids differ by one character.
 */
function hashScore(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  h ^= h >>> 16; h = (h * 0x85ebca6b) >>> 0;
  h ^= h >>> 13; h = (h * 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Pick ONE account for a (member, game) pair using rendezvous / HRW hashing:
 * each enabled account is scored by hash(`${memberId}:${gameId}:${accountId}`)
 * and the highest score wins. Stateless yet STABLE — the same user gets the same
 * account every time, and only users whose specific account is removed/disabled
 * are remapped (minimal reshuffle); it also spreads users roughly evenly.
 * `accounts` must be sorted by id asc so score ties resolve to the smallest id.
 */
function pickAccountForUser(memberId, gameId, accounts) {
  let best = null;
  let bestScore = -1;
  for (const acc of accounts) {
    const score = hashScore(`${memberId}:${gameId}:${acc.id}`);
    if (score > bestScore) {
      bestScore = score;
      best = acc;
    }
  }
  return best;
}

/**
 * Game Web Controller - public APIs for web project
 */
export const gameWebController = {
  /**
   * Get games list with filters and pagination
   * POST /web/games
   */
  getGames: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 20;

    let query = db('games as g')
      .leftJoin('game_category as gc', 'g.category_id', 'gc.id');

    if (body.name) {
      query = query.where('g.name', 'like', `%${body.name}%`);
    }
    if (body.category_id !== undefined && body.category_id !== null && body.category_id !== '') {
      query = query.where('g.category_id', body.category_id);
    }
    if (body.member_level !== undefined && body.member_level !== null && body.member_level !== '') {
      query = query.where('g.member_level', '<=', body.member_level);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const list = await query
      .select(
        'g.id', 'g.name', 'g.desc', 'g.img_url',
        'g.category_id', 'g.tag_ids', 'g.member_level', 'g.detail_url',
        'gc.name as category_name'
      )
      .orderBy('g.id', 'desc')
      .limit(limit)
      .offset(offset);

    // Parse tag_ids JSON
    const parsedList = list.map(item => ({
      ...item,
      tag_ids: typeof item.tag_ids === 'string' ? JSON.parse(item.tag_ids) : item.tag_ids || []
    }));

    // Attach available account count for each game from game_account table
    const listWithAccounts = await Promise.all(
      parsedList.map(async (game) => {
        const [{ available }] = await db('game_account')
          .where('game_id', game.id)
          .where('status', 1)
          .count('* as available');
        return {
          ...game,
          account_count: parseInt(available, 10)
        };
      })
    );

    return {
      code: 0,
      message: '操作成功',
      data: {
        list: listWithAccounts,
        total,
        pageSize: limit,
        currentPage: page
      }
    };
  },

  /**
   * Get THE assigned account for a member-library game (at most one per user).
   * GET /web/games/:id/accounts
   * 会员游戏库(games 表)的账号存于 game_account（game_id = games.id, status=1），
   * 与列表页 account_count 同源；注意区别于租号模块的 rent_game_account。
   * 需要登录：即使游戏下有多个账号，也只返回一个，并按 (会员, 游戏) 稳定分配
   * （同一用户每次拿到同一个账号），见 pickAccountForUser。
   */
  getGameAccounts: async (request, reply) => {
    const user = getWebUser(request);
    if (!user) {
      return reply.code(401).send({ code: 401, message: '请先登录', data: null });
    }

    const gameId = request.params.id;
    if (!gameId) {
      return { code: 10001, message: '游戏ID不能为空', data: null };
    }

    const game = await db('games').where('id', gameId).first();
    if (!game) {
      return { code: 10002, message: '游戏不存在', data: null };
    }

    const accounts = await db('game_account')
      .where('game_id', gameId)
      .where('status', 1)
      .select('id', 'account', 'password', 'platform')
      .orderBy('id', 'asc');

    if (!accounts.length) {
      return { code: 0, message: '操作成功', data: [] };
    }

    const picked = pickAccountForUser(user.memberId, gameId, accounts);
    return { code: 0, message: '操作成功', data: [picked] };
  },

  /**
   * Refresh the Steam verification code (TOTP) for a member-library game account.
   * POST /web/games/account-totp
   * Body: { account_id }
   * Auth: member token required. The code is generated from game_account.secret
   * (shared_secret). Rate limit is scoped per (member, account): at most
   * TOTP_DAILY_LIMIT successful refreshes per day and >= TOTP_COOLDOWN_SECONDS apart.
   */
  refreshAccountTotp: async (request, reply) => {
    const user = getWebUser(request);
    if (!user) {
      return reply.code(401).send({ code: 401, message: '请先登录', data: null });
    }

    const accountId = (request.body || {}).account_id;
    if (!accountId) {
      return { code: 10001, message: '账号ID不能为空', data: null };
    }

    const account = await db('game_account')
      .where('id', accountId)
      .where('status', 1)
      .first();
    if (!account) {
      return { code: 10002, message: '账号不存在或已禁用', data: null };
    }
    if (!account.secret) {
      return { code: 10006, message: '该账号未配置密钥，无法生成验证码', data: null };
    }

    let totp_code = '';
    try {
      totp_code = SteamTotp.generateAuthCode(account.secret);
    } catch (e) {
      totp_code = '';
    }
    if (!totp_code) {
      return { code: 10007, message: '验证码生成失败，请联系客服', data: null };
    }

    // Rate limit (Redis), scoped per member + account. Fail open on Redis outage.
    let remaining = TOTP_DAILY_LIMIT;
    try {
      const redis = getRedis();
      const cdKey = `member:totp:cd:${user.memberId}:${accountId}`;
      const dailyKey = `member:totp:daily:${user.memberId}:${accountId}:${localDateStr()}`;

      const cooling = await redis.get(cdKey);
      if (cooling) {
        const ttl = await redis.ttl(cdKey);
        const wait = ttl > 0 ? ttl : TOTP_COOLDOWN_SECONDS;
        return { code: 10008, message: `操作太频繁，请 ${wait} 秒后再试`, data: { cooldown: wait } };
      }

      // Passed cooldown: arm it now so the next attempt waits, then count the day.
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
      log.warn(`[GameWeb] totp limit check failed for member ${user.memberId} account ${accountId}: ${err.message}`);
    }

    return { code: 0, message: '操作成功', data: { totp_code, remaining } };
  },

  /**
   * Get game detail by ID
   * GET /web/games/:id
   */
  getGameById: async (request, reply) => {
    const { id } = request.params;
    const game = await db('games as g')
      .leftJoin('game_category as gc', 'g.category_id', 'gc.id')
      .select(
        'g.*',
        'gc.name as category_name'
      )
      .where('g.id', id)
      .first();

    if (!game) {
      return {
        code: 10001,
        message: '游戏不存在',
        data: null
      };
    }

    game.tag_ids = typeof game.tag_ids === 'string' ? JSON.parse(game.tag_ids) : game.tag_ids || [];

    return {
      code: 0,
      message: '操作成功',
      data: game
    };
  }
};

export default gameWebController;
