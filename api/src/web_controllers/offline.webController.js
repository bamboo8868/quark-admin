import db from '../utils/db.js';
import SteamTotp from 'steam-totp';
import { log } from '../utils/logger.js';
import { getRedis } from '../config/redis.js';

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

// Max verification-code (TOTP) fetches allowed per CDK per day via /refresh
const TOTP_DAILY_LIMIT = 3;

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
                    version_name: version?.name || ''
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
                version_name: version?.name || ''
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
        // TOTP_DAILY_LIMIT times per day. The counter key is scoped by server-local
        // date and expires at midnight, so it resets automatically each day.
        // Only successful code deliveries are counted.
        try {
            const redis = getRedis();
            const key = `offline:totp:refresh:${cdk.id}:${localDateStr()}`;
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, secondsUntilMidnight());
            }
            if (count > TOTP_DAILY_LIMIT) {
                return {
                    code: 10008,
                    message: `今日验证码获取次数已用完（每天最多${TOTP_DAILY_LIMIT}次），请明天再试`,
                    data: null
                };
            }
        } catch (err) {
            // Fail open: a Redis outage should not block users from getting their code
            log.warn(`[OfflineWeb] refresh limit check failed for CDK ${cdk.cdk_code}: ${err.message}`);
        }

        return { code: 0, message: '操作成功', data: { totp_code } };
    }
};

export default offlineWebController;
