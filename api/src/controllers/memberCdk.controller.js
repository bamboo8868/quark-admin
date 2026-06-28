import { memberCdkService, memberCdkGroupService, memberCdkLogService } from '../services/memberCdk.service.js';

/**
 * Member CDK Admin Controller
 */
export const memberCdkController = {

  getCdks: async (request, reply) => {
    const body = request.body || {};
    const result = await memberCdkService.getCdks(
      {
        cdk_code: body.cdk_code,
        member_level: body.member_level,
        duration_months: body.duration_months,
        status: body.status,
        batch_no: body.batch_no,
        group_id: body.group_id
      },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getCdkById: async (request, reply) => {
    const cdk = await memberCdkService.getCdkById(request.params.id);
    if (!cdk) return { code: 10001, message: 'CDK不存在', data: null };
    return { code: 0, message: '操作成功', data: cdk };
  },

  createCdk: async (request, reply) => {
    try {
      const cdk = await memberCdkService.createCdk(request.body);
      return { code: 0, message: '操作成功', data: cdk };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  batchCreateCdks: async (request, reply) => {
    try {
      const result = await memberCdkService.batchCreateCdks(request.body);
      return { code: 0, message: '操作成功', data: result };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  updateCdk: async (request, reply) => {
    try {
      const cdk = await memberCdkService.updateCdk(request.params.id, request.body);
      return { code: 0, message: '操作成功', data: cdk };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  deleteCdk: async (request, reply) => {
    try {
      await memberCdkService.deleteCdk(request.params.id);
      return { code: 0, message: '操作成功', data: null };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  batchDeleteCdks: async (request, reply) => {
    const { ids } = request.body || {};
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return { code: 10001, message: '请选择要删除的CDK', data: null };
    }
    await memberCdkService.batchDeleteCdks(ids);
    return { code: 0, message: '操作成功', data: null };
  }
};

/**
 * Member CDK Group Controller
 */
export const memberCdkGroupController = {

  getGroups: async (request, reply) => {
    const body = request.body || {};
    const result = await memberCdkGroupService.getGroups(
      {
        name: body.name,
        member_level: body.member_level,
        status: body.status
      },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getGroupById: async (request, reply) => {
    const group = await memberCdkGroupService.getGroupById(request.params.id);
    if (!group) return { code: 10001, message: 'CDK组不存在', data: null };
    return { code: 0, message: '操作成功', data: group };
  },

  createGroup: async (request, reply) => {
    try {
      const group = await memberCdkGroupService.createGroup(request.body);
      return { code: 0, message: '操作成功', data: group };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  updateGroup: async (request, reply) => {
    try {
      const group = await memberCdkGroupService.updateGroup(request.params.id, request.body);
      return { code: 0, message: '操作成功', data: group };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  },

  deleteGroup: async (request, reply) => {
    try {
      await memberCdkGroupService.deleteGroup(request.params.id);
      return { code: 0, message: '操作成功', data: null };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  }
};

/**
 * Member CDK Log Controller
 */
export const memberCdkLogController = {

  getLogs: async (request, reply) => {
    const body = request.body || {};
    const result = await memberCdkLogService.getLogs(
      {
        action: body.action,
        cdk_code: body.cdk_code,
        member_name: body.member_name,
        member_level: body.member_level,
        start_date: body.start_date,
        end_date: body.end_date
      },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  deleteLog: async (request, reply) => {
    try {
      await memberCdkLogService.deleteLog(request.params.id);
      return { code: 0, message: '操作成功', data: null };
    } catch (err) {
      return { code: 10002, message: err.message, data: null };
    }
  }
};
