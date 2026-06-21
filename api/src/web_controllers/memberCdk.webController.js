import { verifyAccessToken } from '../utils/jwt.js';
import { memberCdkService } from '../services/memberCdk.service.js';
import db from '../utils/db.js';

/**
 * Extract and verify web user token from Authorization header
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
 * Member CDK Web Controller - CDK redemption for web project
 */
export const memberCdkWebController = {
  /**
   * Redeem a membership CDK
   * POST /web/membership/redeem-cdk
   */
  redeemCdk: async (request, reply) => {
    const user = getWebUser(request);
    if (!user) {
      return reply.code(401).send({ code: 401, message: '请先登录', data: null });
    }

    const { cdk_code } = request.body || {};
    if (!cdk_code || !cdk_code.trim()) {
      return { code: 10001, message: '请输入CDK兑换码', data: null };
    }

    try {
      const result = await memberCdkService.redeemCdk(cdk_code.trim().toUpperCase(), user.memberId);

      // Map level number to name
      const levelNames = { 0: '普通用户', 1: '青铜会员', 2: '黄金会员' };

      return {
        code: 0,
        message: '兑换成功',
        data: {
          member_level: result.member_level,
          member_level_name: levelNames[result.member_level] || '未知',
          member_expire_at: result.member_expire_at,
          duration_months: result.duration_months
        }
      };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  /**
   * Get current member info (level, expiry)
   * POST /web/membership/my-info
   */
  getMyInfo: async (request, reply) => {
    const user = getWebUser(request);
    if (!user) {
      return reply.code(401).send({ code: 401, message: '请先登录', data: null });
    }

    const member = await db('members')
      .where('id', user.memberId)
      .select('id', 'username', 'nickname', 'member_level', 'member_expire_at')
      .first();

    if (!member) {
      return { code: 10001, message: '会员不存在', data: null };
    }

    const levelNames = { 0: '普通用户', 1: '青铜会员', 2: '黄金会员' };

    return {
      code: 0,
      message: '操作成功',
      data: {
        ...member,
        member_level_name: levelNames[member.member_level] || '未知'
      }
    };
  }
};
