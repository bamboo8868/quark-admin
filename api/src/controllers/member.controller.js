import { memberService } from '../services/member.service.js';
import log from '../utils/logger.js';

/**
 * Member Controller
 */
export const memberController = {
  /**
   * Get members list
   * POST /members
   */
  getMembers: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;

    const filters = {
      username: body.username,
      nickname: body.nickname,
      email: body.email,
      status: body.status,
      member_level: body.member_level
    };

    const result = await memberService.getMembers(filters, page, limit);

    return {
      code: 0,
      message: '操作成功',
      data: result
    };
  },

  /**
   * Get member by ID
   * GET /members/:id
   */
  getMemberById: async (request, reply) => {
    const { id } = request.params;
    const member = await memberService.getMemberById(id);

    if (!member) {
      return {
        code: 10001,
        message: '会员不存在',
        data: null
      };
    }

    return {
      code: 0,
      message: '操作成功',
      data: member
    };
  },

  /**
   * Create member
   * POST /members/create
   */
  createMember: async (request, reply) => {
    try {
      const member = await memberService.createMember(request.body);
      log.info(`[Member] Created member: ${member.username}`);

      return {
        code: 0,
        message: '操作成功',
        data: member
      };
    } catch (err) {
      return {
        code: 10002,
        message: err.message,
        data: null
      };
    }
  },

  /**
   * Update member
   * PUT /members/:id
   */
  updateMember: async (request, reply) => {
    try {
      const { id } = request.params;
      const member = await memberService.updateMember(id, request.body);
      log.info(`[Member] Updated member ID: ${id}`);

      return {
        code: 0,
        message: '操作成功',
        data: member
      };
    } catch (err) {
      return {
        code: 10002,
        message: err.message,
        data: null
      };
    }
  },

  /**
   * Delete member
   * DELETE /members/:id
   */
  deleteMember: async (request, reply) => {
    const { id } = request.params;
    await memberService.deleteMember(id);
    log.info(`[Member] Deleted member ID: ${id}`);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Batch delete members
   * POST /members/batch-delete
   */
  batchDeleteMembers: async (request, reply) => {
    const { ids } = request.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return {
        code: 10001,
        message: '请选择要删除的会员',
        data: null
      };
    }

    await memberService.batchDeleteMembers(ids);
    log.info(`[Member] Batch deleted members: ${ids.join(', ')}`);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Update member level
   * PUT /members/:id/level
   */
  updateMemberLevel: async (request, reply) => {
    const { id } = request.params;
    const { member_level, member_expire_at } = request.body;

    await memberService.updateMemberLevel(id, member_level, member_expire_at);
    log.info(`[Member] Updated member ${id} level to ${member_level}`);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  }
};
