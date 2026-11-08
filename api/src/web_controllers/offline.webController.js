import db from '../utils/db.js';
import SteamTotp from 'steam-totp';
import { log } from '../utils/logger.js';
import { getRedis } from '../config/redis.js';
import { offlineAccountService } from '../services/offline.service.js';
import { settingService } from '../services/config.service.js';

/**
 * Generate a TOTP code from an account's shared secret, safe against errors
 */
function genTotp(secret) {
    if (!secret) return '';
    try {
        return SteamTotp.generateAuthCode(secret);
    } catch (e) {
        return '';
    }
}

/**
 * Format a date as yyyy-MM-dd HH:mm:ss (project-wide API time format)
 */
function formatDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Offline accounts are valid for this many years from the redemption time (used_at)
const OFFLINE_VALID_YEARS = 1;

/**
 * Compute the offline account expiry date: redemption time + OFFLINE_VALID_YEARS.
 * Returns a new Date (the input is never mutated).
 */
function offlineExpireDate(usedAt) {
    const base = usedAt ? new Date(usedAt) : new Date();
    const d = isNaN(base.getTime()) ? new Date() : base;
    d.setFullYear(d.getFullYear() + OFFLINE_VALID_YEARS);
    return d;
}

// Default max verification-code (TOTP) fetches allowed per CDK per day via /refresh.
// Overridden per game by offline_games.refresh_count when configured.
const TOTP_DAILY_LIMIT = 3;

// Minimum seconds between two verification-code fetches for the same CDK.
const TOTP_COOLDOWN_SECONDS = 10;

/**
 * Server-local date string (YYYYMMDD) used to scope daily Redis counter keys
 */
function localDateStr() {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Seconds remaining until the next server-local midnight (min 1)
 */
function secondsUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(1, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

/**
 * Look up the most recent verification code emailed for a game account within
 * the last 24 hours (from the synced `emails` table). Returns '' when none found.
 */
async function latestEmailCode(gameAccount) {
    if (!gameAccount) return '';
    try {
        const since = new Date(Date.now() - 300000);
        const row = await db('emails')
            .where('game_account', gameAccount)
            .where('mail_date', '>=', since)
            .orderBy('mail_date', 'desc')
            .first();
        return row?.code || '';
    } catch (err) {
        log.warn(`[OfflineWeb] email code lookup failed for ${gameAccount}: ${err.message}`);
        return '';
    }
}

/**
 * Resolve the verification code for an offline account:
 *  1) TOTP generated from the shared secret (account.code) when present;
 *  2) otherwise fall back to the latest emailed code within the last day.
 */
async function resolveTotpCode(account) {
    if (account && account.code) {
        const totp = genTotp(account.code);
        if (totp) return totp;
    }
    return latestEmailCode(account ? account.account : '');
}

/**
 * Resolve the per-CDK daily fetch limit from the game's refresh_count config
 */
function resolveDailyLimit(game) {
    if (game && Number.isFinite(Number(game.refresh_count)) && Number(game.refresh_count) > 0) {
        return Number(game.refresh_count);
    }
    return TOTP_DAILY_LIMIT;
}

/**
 * Read today's remaining code fetches for a CDK WITHOUT consuming quota.
 * Returns null when Redis is unavailable (fail open).
 */
async function remainingToday(cdkId, dailyLimit) {
    try {
        const redis = getRedis();
        const key = `offline:totp:refresh:${cdkId}:${localDateStr()}`;
        const used = parseInt(await redis.get(key), 10) || 0;
        return Math.max(0, dailyLimit - used);
    } catch (err) {
        log.warn(`[OfflineWeb] remaining quota lookup failed for CDK ${cdkId}: ${err.message}`);
        return null;
    }
}

/**
 * Offline Web Controller - public APIs for the offline CDK redemption page (no auth required)
 *
 * Offline CDKs are PERMANENT: once redeemed, the bound account stays assigned forever
 * (no rental duration / expiry). Re-entering a used CDK returns the same bound account
 * with a freshly generated TOTP code.
 */
export const offlineWebController = {
    /**
     * Redeem an offline CDK to get a permanent game account
     * POST /web/offline/redeem
     * Body: { cdk }
     */
    redeem: async (request, reply) => {
        const now = new Date();
        const { cdk: cdkCode } = request.body || {};
        if (!cdkCode || !cdkCode.trim()) {
            return { code: 10001, message: '请输入兑换码', data: null };
        }

        const cdk = await db('offline_cdk').where('cdk_code', cdkCode.trim()).first();
        if (!cdk) {
            return { code: 10002, message: '兑换码不存在', data: null };
        }
        if (cdk.status === 3) {
            return { code: 10006, message: '该兑换码已被禁用', data: null };
        }
        if (cdk.status === 2) {
            return { code: 10004, message: '该兑换码已过期', data: null };
        }
        if (cdk.expire_at && new Date(cdk.expire_at) < now) {
            await db('offline_cdk').where('id', cdk.id).update({ status: 2 });
            return { code: 10004, message: '该兑换码已过期', data: null };
        }

        // Already redeemed (permanent): return the bound account with a fresh TOTP
        if (cdk.status === 1) {
            // Offline accounts are only valid for OFFLINE_VALID_YEARS from the
            // redemption time (used_at). Past that window the CDK is treated as
            // expired and can no longer be re-redeemed.
            if (cdk.used_at && offlineExpireDate(cdk.used_at) < now) {
                return { code: 10010, message: 'CDK已到期，请联系客服', data: null };
            }
            if (!cdk.account_id) {
                return { code: 10005, message: '该兑换码未关联游戏账号', data: null };
            }
            const account = await db('offline_game_account').where('id', cdk.account_id).first();
            if (!account) {
                return { code: 10005, message: '关联的游戏账号不存在', data: null };
            }
            const game = await db('offline_games').where('id', cdk.game_id).first();
            const version = await db('offline_game_version').where('id', cdk.version_id).first();
            return {
                code: 0,
                message: '提取成功',
                data: {
                    account: account.account,
                    password: account.password,
                    totp_code: '',
                    game_name: game?.name || '',
                    version_name: version?.name || '',
                    expire_time: formatDate(offlineExpireDate(cdk.used_at)),
                    remaining: await remainingToday(cdk.id, resolveDailyLimit(game))
                }
            };
        }

        // First-time redemption (status=0): auto-assign an available account from this version
        const game = await db('offline_games').where('id', cdk.game_id).first();
        const version = await db('offline_game_version').where('id', cdk.version_id).first();

        // Auto-assign the enabled account with the FEWEST bound CDKs (load balance).
        // Accounts are NOT consumed: one account can be bound by unlimited CDKs.
        const candidates = await db('offline_game_account')
            .where('version_id', cdk.version_id)
            .orderBy('id', 'asc');
        if (candidates.length === 0) {
            return { code: 10007, message: '该版本下暂无可用账号', data: null };
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

        // Mark CDK as used and bind the account (permanent)
        await db('offline_cdk').where('id', cdk.id).update({
            status: 1,
            account_id: account.id,
            used_by: 'web',
            used_at: now,
            updated_at: now
        });

        // Note: the account is NOT consumed — it stays status=1 and can be
        // bound by additional CDKs (one account : many CDKs).

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
            username: 'web',
            ip: request.ip || ''
        });

        log.info(`[OfflineWeb] Redeemed: ${cdk.cdk_code}, account: ${account.account}`);

        return {
            code: 0,
            message: '兑换成功',
            data: {
                account: account.account,
                password: account.password,
                totp_code: '',
                game_name: game?.name || '',
                version_name: version?.name || '',
                expire_time: formatDate(offlineExpireDate(now)),
                remaining: await remainingToday(cdk.id, resolveDailyLimit(game))
            }
        };
    },

    /**
     * Refresh the TOTP code for a redeemed offline CDK's bound account
     * POST /web/offline/refresh
     * Body: { cdk }
     */
    refresh: async (request, reply) => {
        const { cdk: cdkCode } = request.body || {};
        if (!cdkCode || !cdkCode.trim()) {
            return { code: 10001, message: '请输入兑换码', data: null };
        }

        const cdk = await db('offline_cdk').where('cdk_code', cdkCode.trim()).first();
        if (!cdk) {
            return { code: 10002, message: '兑换码不存在', data: null };
        }
        if (cdk.status !== 1) {
            return { code: 10003, message: '该兑换码尚未兑换', data: null };
        }
        if (!cdk.account_id) {
            return { code: 10005, message: '该兑换码未关联游戏账号', data: null };
        }

        const account = await db('offline_game_account').where('id', cdk.account_id).first();
        if (!account) {
            return { code: 10005, message: '关联的游戏账号不存在', data: null };
        }

        // Resolve the verification code first: TOTP from the shared secret, or the
        // latest emailed Steam code within the last day. If neither is available,
        // return a clear error WITHOUT consuming a daily refresh attempt.
        const totp_code = await resolveTotpCode(account);
        if (!totp_code) {
            return { code: 10009, message: '暂未获取到验证码，请联系客服', data: null };
        }

        // Daily limit (Redis): each CDK may fetch the verification code at most
        // N times per day, where N is the game's configured refresh_count (default
        // TOTP_DAILY_LIMIT). The counter key is scoped by server-local date and
        // expires at midnight, so it resets automatically each day.
        // Only successful code deliveries are counted.
        const game = await db('offline_games').where('id', cdk.game_id).first();
        const dailyLimit = resolveDailyLimit(game);
        let remaining = null;
        try {
            const redis = getRedis();

            // Cooldown: at most one successful fetch per TOTP_COOLDOWN_SECONDS per CDK.
            const cdKey = `offline:totp:cd:${cdk.id}`;
            const cooling = await redis.get(cdKey);
            if (cooling) {
                const ttl = await redis.ttl(cdKey);
                const wait = ttl > 0 ? ttl : TOTP_COOLDOWN_SECONDS;
                return {
                    code: 10008,
                    message: `操作太频繁，请 ${wait} 秒后再试`,
                    data: { cooldown: wait }
                };
            }
            // Passed cooldown: arm it now so the next attempt must wait.
            await redis.set(cdKey, '1', 'EX', TOTP_COOLDOWN_SECONDS);

            const key = `offline:totp:refresh:${cdk.id}:${localDateStr()}`;
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, secondsUntilMidnight());
            }
            if (count > dailyLimit) {
                return {
                    code: 10008,
                    message: `今日验证码获取次数已用完（每天最多${dailyLimit}次），请明天再试`,
                    data: { remaining: 0 }
                };
            }
            remaining = Math.max(0, dailyLimit - count);
        } catch (err) {
            // Fail open: a Redis outage should not block users from getting their code
            log.warn(`[OfflineWeb] refresh limit check failed for CDK ${cdk.cdk_code}: ${err.message}`);
        }

        return { code: 0, message: '操作成功', data: { totp_code, cooldown: TOTP_COOLDOWN_SECONDS, remaining } };
    },

    /**
     * Logout (deauthorize all devices) the offline account found by nickname.
     * A valid redeemed CDK acts as the credential; the nickname selects which
     * account to logout (no ownership binding between CDK and nickname).
     * POST /web/offline/logout
     * Body: { cdk, nickname }
     */
    logout: async (request, reply) => {
        // Feature switch (admin-configurable, effective without restart)
        const enabled = await settingService.getLogoutEnabled();
        if (!enabled) {
            return { code: 10013, message: '注销功能暂未开启，请稍后再试或联系客服', data: null };
        }

        const { cdk: cdkCode, nickname } = request.body || {};
        if (!cdkCode || !cdkCode.trim()) {
            return { code: 10001, message: '请输入兑换码', data: null };
        }
        if (!nickname || !nickname.trim()) {
            return { code: 10001, message: '请输入账号昵称', data: null };
        }

        const cdk = await db('offline_cdk').where('cdk_code', cdkCode.trim()).first();
        if (!cdk) {
            return { code: 10002, message: '兑换码不存在', data: null };
        }
        if (cdk.status !== 1) {
            return { code: 10003, message: '该兑换码尚未兑换，无法注销', data: null };
        }

        // Resolve the target account by nickname (exact match)
        const account = await db('offline_game_account').where('nickname', nickname.trim()).first();
        if (!account) {
            return { code: 10005, message: '未找到该昵称对应的离线账号，请检查昵称是否正确', data: null };
        }

        // Config-driven limits (Redis, fail-open): each logout spins up a real
        // browser, so throttle per CDK and cap successful logouts per day.
        const cooldownSeconds = await settingService.getLogoutCooldownSeconds();
        const dailyLimit = await settingService.getLogoutDailyLimit();
        const dayKey = `offline:logout:day:${cdk.id}:${localDateStr()}`;
        let remaining = null;
        try {
            const redis = getRedis();
            if (cooldownSeconds > 0) {
                const cdKey = `offline:logout:cd:${cdk.id}`;
                const cooling = await redis.get(cdKey);
                if (cooling) {
                    const ttl = await redis.ttl(cdKey);
                    const wait = ttl > 0 ? ttl : cooldownSeconds;
                    return {
                        code: 10008,
                        message: `操作太频繁，请 ${wait} 秒后再试`,
                        data: { cooldown: wait }
                    };
                }
                await redis.set(cdKey, '1', 'EX', cooldownSeconds);
            }
            const used = parseInt(await redis.get(dayKey), 10) || 0;
            if (used >= dailyLimit) {
                return {
                    code: 10008,
                    message: `今日注销次数已用完（每天最多${dailyLimit}次），请明天再试`,
                    data: { remaining: 0 }
                };
            }
        } catch (err) {
            log.warn(`[OfflineWeb] logout limit check failed for CDK ${cdk.cdk_code}: ${err.message}`);
        }

        try {
            await offlineAccountService.logout(account.id);
        } catch (err) {
            return { code: 10012, message: err.message || '注销失败，请稍后重试', data: null };
        }

        // Only successful logouts consume the daily quota; counter resets at midnight
        try {
            const redis = getRedis();
            const count = await redis.incr(dayKey);
            if (count === 1) {
                await redis.expire(dayKey, secondsUntilMidnight());
            }
            remaining = Math.max(0, dailyLimit - count);
        } catch (err) {
            log.warn(`[OfflineWeb] logout quota count failed for CDK ${cdk.cdk_code}: ${err.message}`);
        }

        // Log the logout (best effort — never fail the response over logging)
        // Game/version info comes from the searched account, not the CDK.
        try {
            const game = await db('offline_games').where('id', account.game_id).first();
            const version = await db('offline_game_version').where('id', account.version_id).first();
            await db('offline_log').insert({
                cdk_id: cdk.id,
                game_id: account.game_id,
                version_id: account.version_id,
                account_id: account.id,
                game_name: game?.name || '',
                version_name: version?.name || '',
                cdk_code: cdk.cdk_code,
                account: account.account,
                action: 'logout',
                username: 'web',
                ip: request.ip || ''
            });
        } catch (err) {
            log.warn(`[OfflineWeb] logout log insert failed for CDK ${cdk.cdk_code}: ${err.message}`);
        }

        log.info(`[OfflineWeb] Logout via web: ${cdk.cdk_code}, account: ${account.account}`);

        const game = await db('offline_games').where('id', account.game_id).first();
        return {
            code: 0,
            message: '注销成功',
            data: {
                account: account.account,
                nickname: account.nickname || '',
                game_name: game?.name || '',
                cooldown: cooldownSeconds,
                remaining
            }
        };
    }
};

export default offlineWebController;
