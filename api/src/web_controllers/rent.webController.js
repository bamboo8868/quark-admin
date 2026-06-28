import { verifyAccessToken } from '../utils/jwt.js';
import db from '../utils/db.js';
import SteamTotp from 'steam-totp';

/**
 * Format date as yyyy-MM-dd HH:mm:ss
 */
function formatDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * Extract and verify web user token from Authorization header
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

/**
 * Rent Web Controller - public APIs for web project (rent module)
 */
export const rentWebController = {
    /**
     * Get active rent games (status=1) with account count
     * GET /web/rent/games
     */
    getRentGames: async (request, reply) => {
        const games = await db('rent_games as g')
            .where('g.status', 1)
            .select('g.*')
            .orderBy('g.id', 'desc');

        // Attach available account count for each game
        const result = await Promise.all(
            games.map(async (game) => {
                const [{ available }] = await db('rent_game_account')
                    .where('game_id', game.id)
                    .where('status', 1)
                    .count('* as available');
                const [{ total }] = await db('rent_game_account')
                    .where('game_id', game.id)
                    .count('* as total');
                return {
                    ...game,
                    available_accounts: parseInt(available, 10),
                    total_accounts: parseInt(total, 10)
                };
            })
        );

        return { code: 0, message: '操作成功', data: result };
    },

    /**
     * Get available accounts for a specific game
     * GET /web/rent/games/:id/accounts
     */
    getGameAccounts: async (request, reply) => {
        const gameId = request.params.id;
        if (!gameId) {
            return { code: 10001, message: '游戏ID不能为空', data: null };
        }

        const game = await db('rent_games').where('id', gameId).first();
        if (!game) {
            return { code: 10002, message: '游戏不存在', data: null };
        }

        // Get available accounts (status=1) for this game
        // Only return safe fields (no password, no code/shared_secret)
        const accounts = await db('rent_game_account')
            .where('game_id', gameId)
            .where('status', 1)
            .select('id', 'account', 'platform', 'status', 'created_at')
            .orderBy('id', 'asc');

        return { code: 0, message: '操作成功', data: accounts };
    },

    /**
     * Redeem a CDK code (requires login)
     * POST /web/rent/redeem
     * Body: { cdk_code }
     */
    redeemCdk: async (request, reply) => {
        const user = getWebUser(request);
        if (!user) {
            return { code: 401, message: '请先登录', data: null };
        }

        const { cdk_code } = request.body || {};
        if (!cdk_code || !cdk_code.trim()) {
            return { code: 10001, message: '请输入CDK码', data: null };
        }

        const cdk = await db('rent_cdk').where('cdk_code', cdk_code.trim()).first();
        if (!cdk) {
            return { code: 10002, message: 'CDK码不存在', data: null };
        }
        if (cdk.status === 1) {
            return { code: 10003, message: '该CDK已被使用', data: null };
        }
        if (cdk.status === 2) {
            return { code: 10004, message: '该CDK已过期', data: null };
        }
        // Check CDK expiration
        if (cdk.expire_at && new Date(cdk.expire_at) < new Date()) {
            await db('rent_cdk').where('id', cdk.id).update({ status: 2 });
            return { code: 10004, message: '该CDK已过期', data: null };
        }

        // Look up account
        if (!cdk.account_id) {
            return { code: 10005, message: '该CDK未关联游戏账号', data: null };
        }
        const account = await db('rent_game_account').where('id', cdk.account_id).first();
        if (!account) {
            return { code: 10005, message: '关联的游戏账号不存在', data: null };
        }
        if (account.status === 2) {
            return { code: 10006, message: '该游戏账号已被出租中，请稍后再试', data: null };
        }

        // Look up game
        const game = await db('rent_games').where('id', cdk.game_id).first();

        // Calculate rent_expire_at
        const now = new Date();
        const rentExpireAt = new Date(now.getTime() + (cdk.rent_hours || 24) * 60 * 60 * 1000);

        // Mark CDK as used
        await db('rent_cdk').where('id', cdk.id).update({
            status: 1,
            used_by: user.username,
            used_at: now,
            rent_expire_at: rentExpireAt,
            updated_at: now
        });

        // Mark account as rented
        await db('rent_game_account').where('id', account.id).update({
            status: 2,
            updated_at: now
        });

        // Log
        await db('rent_log').insert({
            cdk_id: cdk.id,
            game_id: cdk.game_id,
            account_id: account.id,
            game_name: game?.name || '',
            cdk_code: cdk.cdk_code,
            account: account.account,
            rent_hours: cdk.rent_hours || 24,
            action: 'redeem',
            username: user.username,
            ip: request.ip || ''
        });

        let totp_code = '';
        if (account.code) {
            try { totp_code = SteamTotp.generateAuthCode(account.code); } catch (e) { totp_code = ''; }
        }

        return {
            code: 0,
            message: '兑换成功',
            data: {
                account: account.account,
                password: account.password,
                game_name: game?.name || '',
                totp_code,
                rent_hours: cdk.rent_hours || 24,
                rent_expire_at: formatDate(rentExpireAt)
            }
        };
    },

    /**
     * Get current user's rental history (requires login)
     * POST /web/rent/my-rentals
     */
    getMyRentals: async (request, reply) => {
        const user = getWebUser(request);
        if (!user) {
            return { code: 401, message: '请先登录', data: null };
        }

        const rentals = await db('rent_log as l')
            .leftJoin('rent_games as g', 'l.game_id', 'g.id')
            .select(
                'l.id', 'l.game_name', 'l.cdk_code', 'l.account',
                'l.rent_hours', 'l.action', 'l.created_at',
                'g.cover as game_cover',
                'g.platform as game_platform'
            )
            .where('l.username', user.username)
            .orderBy('l.created_at', 'desc')
            .limit(50);

        return { code: 0, message: '操作成功', data: rentals };
    },

    // ==================== CDK Public Endpoints (no auth required) ====================

    /**
     * CDK Config - get site configuration
     * GET /web/cdk/config
     */
    cdkConfig: async (request, reply) => {
        return { code: 0, message: '操作成功', data: { name: 'Steam' } };
    },

    /**
     * CDK Exchange - redeem CDK to get a game account
     * POST /web/cdk/exchange
     * Body: { cdk, account? }
     */
    cdkExchange: async (request, reply) => {
        const now = new Date();
        const { cdk: cdkCode, account: preferredAccount } = request.body || {};
        if (!cdkCode || !cdkCode.trim()) {
            return { code: 10001, message: '请输入CDK码', data: null };
        }

        const cdk = await db('rent_cdk').where('cdk_code', cdkCode.trim()).first();
        if (!cdk) {
            return { code: 10002, message: 'CDK码不存在', data: null };
        }
        if (cdk.status === 2) {
            return { code: 10004, message: '该CDK已过期', data: null };
        }
        if (cdk.expire_at && new Date(cdk.expire_at) < new Date()) {
            await db('rent_cdk').where('id', cdk.id).update({ status: 2 });
            return { code: 10004, message: '该CDK已过期', data: null };
        }

        // Reset expired rented accounts back to available for this game
        await db('rent_game_account')
            .where('status', 2)
            .where('rent_end_at', '<', now)
            .update({
                status: 1,
                rent_start_at: null,
                rent_end_at: null,
                updated_at: now
            });


        // If CDK is already used, allow re-extraction without changing rental period
        if (cdk.status === 1) {
            // Check if rental is still active
            if (!cdk.rent_expire_at || new Date(cdk.rent_expire_at) < new Date()) {
                return { code: 10004, message: '该CDK租期已过期', data: null };
            }
            // Rental is still active - return account info without changes
            const account = await db('rent_game_account').where('id', cdk.account_id).first();
            if (!account) {
                return { code: 10005, message: '关联的游戏账号不存在', data: null };
            }
            const game = await db('rent_games').where('id', cdk.game_id).first();
            let totp_code = '';
            if (account.code) {
                try { totp_code = SteamTotp.generateAuthCode(account.code); } catch (e) { totp_code = ''; }
            }
            return {
                code: 0,
                message: '提取成功',
                data: {
                    account: account.account,
                    password: account.password,
                    game_name: game?.name || '',
                    totp_code,
                    start_time: formatDate(account.rent_start_at),
                    end_time: formatDate(cdk.rent_expire_at)
                }
            };
        }

        // Look up game
        const game = await db('rent_games').where('id', cdk.game_id).first();





        // Find account: prefer user-specified account, fallback to CDK-linked account
        let account = null;
        if (preferredAccount && preferredAccount.trim()) {
            // User wants a specific account
            account = await db('rent_game_account')
                .where('game_id', cdk.game_id)
                .where('account', preferredAccount.trim())
                .first();
            if (!account) {
                return { code: 10005, message: '指定的账号不存在', data: null };
            }
            if (account.status === 2) {
                return { code: 10006, message: '该账号已被出租中', data: null };
            }
        } else if (cdk.account_id) {
            // Use CDK-linked account
            account = await db('rent_game_account').where('id', cdk.account_id).first();
            if (!account) {
                return { code: 10005, message: '关联的游戏账号不存在', data: null };
            }
            if (account.status === 2) {
                return { code: 10006, message: '该游戏账号已被出租中', data: null };
            }
        } else {
            // Random available account for this game
            account = await db('rent_game_account')
                .where('game_id', cdk.game_id)
                .where('status', 1)
                .first();
            if (!account) {
                return { code: 10007, message: '暂无可用账号', data: null };
            }
        }

        // Calculate rent period
        const rentExpireAt = new Date(now.getTime() + (cdk.rent_hours || 24) * 60 * 60 * 1000);

        // Mark CDK as used and bind account
        await db('rent_cdk').where('id', cdk.id).update({
            status: 1,
            account_id: account.id,
            used_by: 'web',
            used_at: now,
            rent_expire_at: rentExpireAt,
            updated_at: now
        });

        // Mark account as rented
        await db('rent_game_account').where('id', account.id).update({
            status: 2,
            rent_start_at: now,
            rent_end_at: rentExpireAt,
            updated_at: now
        });

        // Log
        await db('rent_log').insert({
            cdk_id: cdk.id,
            game_id: cdk.game_id,
            account_id: account.id,
            game_name: game?.name || '',
            cdk_code: cdk.cdk_code,
            account: account.account,
            rent_hours: cdk.rent_hours || 24,
            action: 'redeem',
            username: 'web',
            ip: request.ip || ''
        });

        return {
            code: 0,
            message: '兑换成功',
            data: {
                account: account.account,
                password: account.password,
                game_name: game?.name || '',
                totp_code: account.code ? (() => { try { return SteamTotp.generateAuthCode(account.code); } catch (e) { return ''; } })() : '',
                start_time: formatDate(now),
                end_time: formatDate(rentExpireAt)
            }
        };
    },

    /**
     * CDK Renew - extend rental period with a new CDK
     * POST /web/cdk/rent
     * Body: { cdk, renew_cdk }
     */
    cdkRenew: async (request, reply) => {
        const { cdk: originalCdkCode, renew_cdk: renewCdkCode } = request.body || {};
        if (!originalCdkCode || !originalCdkCode.trim()) {
            return { code: 10001, message: '请输入原始CDK码', data: null };
        }
        if (!renewCdkCode || !renewCdkCode.trim()) {
            return { code: 10001, message: '请输入续费CDK码', data: null };
        }

        // Find original CDK
        const originalCdk = await db('rent_cdk').where('cdk_code', originalCdkCode.trim()).first();
        if (!originalCdk) {
            return { code: 10002, message: '原始CDK不存在', data: null };
        }
        if (originalCdk.status !== 1) {
            return { code: 10003, message: '原始CDK未被使用，无法续费', data: null };
        }

        // Find renewal CDK
        const renewCdk = await db('rent_cdk').where('cdk_code', renewCdkCode.trim()).first();
        if (!renewCdk) {
            return { code: 10002, message: '续费CDK不存在', data: null };
        }
        if (renewCdk.status === 1) {
            return { code: 10003, message: '续费CDK已被使用', data: null };
        }
        if (renewCdk.status === 2) {
            return { code: 10004, message: '续费CDK已过期', data: null };
        }
        if (renewCdk.expire_at && new Date(renewCdk.expire_at) < new Date()) {
            await db('rent_cdk').where('id', renewCdk.id).update({ status: 2 });
            return { code: 10004, message: '续费CDK已过期', data: null };
        }

        // Must be same game
        if (renewCdk.game_id !== originalCdk.game_id) {
            return { code: 10008, message: '续费CDK与原始CDK不属于同一游戏', data: null };
        }

        // Get account from original CDK
        const account = await db('rent_game_account').where('id', originalCdk.account_id).first();
        if (!account) {
            return { code: 10005, message: '关联的游戏账号不存在', data: null };
        }

        // Extend rent: start from current expire time (or now if expired)
        const now = new Date();
        const currentExpire = originalCdk.rent_expire_at
            ? new Date(originalCdk.rent_expire_at)
            : now;
        const baseTime = currentExpire > now ? currentExpire : now;
        const newExpireAt = new Date(baseTime.getTime() + (renewCdk.rent_hours || 24) * 60 * 60 * 1000);

        // Mark renewal CDK as used
        await db('rent_cdk').where('id', renewCdk.id).update({
            status: 1,
            used_by: 'web',
            used_at: now,
            rent_expire_at: newExpireAt,
            updated_at: now
        });

        // Update original CDK expire time
        await db('rent_cdk').where('id', originalCdk.id).update({
            rent_expire_at: newExpireAt,
            updated_at: now
        });

        // Update account rent end time
        await db('rent_game_account').where('id', account.id).update({
            rent_end_at: newExpireAt,
            updated_at: now
        });

        // Log
        await db('rent_log').insert({
            cdk_id: renewCdk.id,
            game_id: renewCdk.game_id,
            account_id: account.id,
            game_name: (await db('rent_games').where('id', renewCdk.game_id).first())?.name || '',
            cdk_code: renewCdk.cdk_code,
            account: account.account,
            rent_hours: renewCdk.rent_hours || 24,
            action: 'renew',
            username: 'web',
            ip: request.ip || ''
        });

        return { code: 0, message: '续费成功', data: { new_expire_at: formatDate(newExpireAt) } };
    },

    /**
     * CDK Refresh - get dynamic verification code for the rented account
     * POST /web/cdk/refresh
     * Body: { cdk }
     */
    cdkRefresh: async (request, reply) => {
        const { cdk: cdkCode } = request.body || {};
        if (!cdkCode || !cdkCode.trim()) {
            return { code: 10001, message: '请输入CDK码', data: null };
        }

        const cdk = await db('rent_cdk').where('cdk_code', cdkCode.trim()).first();
        if (!cdk) {
            return { code: 10002, message: 'CDK不存在', data: null };
        }
        if (cdk.status !== 1) {
            return { code: 10003, message: '该CDK未被使用', data: null };
        }

        // Check if rental is still active
        if (cdk.rent_expire_at && new Date(cdk.rent_expire_at) < new Date()) {
            return { code: 10004, message: '该CDK租期已过期', data: null };
        }

        // Get account's dynamic code
        if (!cdk.account_id) {
            return { code: 10005, message: '该CDK未关联游戏账号', data: null };
        }
        const account = await db('rent_game_account').where('id', cdk.account_id).first();
        if (!account) {
            return { code: 10005, message: '关联的游戏账号不存在', data: null };
        }

        let totp_code = '';
        if (account.code) {
            try { totp_code = SteamTotp.generateAuthCode(account.code); } catch (e) { totp_code = ''; }
        }

        return { code: 0, message: '操作成功', data: { code: totp_code } };
    },

    /**
     * Get account list with game info (for navigation page)
     * POST /web/accounts/list
     * Body: { page?, search? }
     */
    getAccountList: async (request, reply) => {
        const body = request.body || {};
        const page = body.page || 1;
        const limit = 50;
        const search = body.search || '';

        let query = db('rent_game_account as a')
            .leftJoin('rent_games as g', 'a.game_id', 'g.id')
            .where('a.status', 1); // only available accounts

        if (search) {
            query = query.where(function() {
                this.where('g.name', 'like', `%${search}%`)
                    .orWhere('a.account', 'like', `%${search}%`);
            });
        }

        const countQuery = query.clone();
        const [{ count }] = await countQuery.count('* as count');
        const total = parseInt(count, 10);

        const offset = (page - 1) * limit;
        const list = await query
            .select(
                'a.id',
                'a.account',
                'a.password',
                'a.platform',
                'g.name as game_name',
                'g.cover as game_cover'
            )
            .orderBy('g.name', 'asc')
            .orderBy('a.id', 'asc')
            .limit(limit)
            .offset(offset);

        return {
            code: 0,
            message: '操作成功',
            data: {
                list,
                total,
                pageSize: limit,
                currentPage: page
            }
        };
    }
};

export default rentWebController;
