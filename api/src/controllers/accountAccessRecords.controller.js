import { accountAccessRecordsService } from '../services/accountAccessRecords.service.js';

/**
 * Account Access Records Controller - D加密账号管理 CRUD operations
 */
export const accountAccessRecordsController = {
  /**
   * Get records list
   * POST /account-access
   */
  getRecords: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;

    const filters = {
      account: body.account,
      game_name: body.game_name
    };

    const result = await accountAccessRecordsService.getRecords(filters, page, limit);

    return {
      code: 0,
      message: '操作成功',
      data: result
    };
  },

  /**
   * Get record by ID
   * GET /account-access/:id
   */
  getRecordById: async (request, reply) => {
    const { id } = request.params;
    const record = await accountAccessRecordsService.getRecordById(id);

    if (!record) {
      return {
        code: 10001,
        message: '账号不存在',
        data: null
      };
    }

    return {
      code: 0,
      message: '操作成功',
      data: record
    };
  },

  /**
   * Create record
   * POST /account-access/create
   */
  createRecord: async (request, reply) => {
    const record = await accountAccessRecordsService.createRecord(request.body);

    return {
      code: 0,
      message: '操作成功',
      data: record
    };
  },

  /**
   * Update record
   * PUT /account-access/:id
   */
  updateRecord: async (request, reply) => {
    const { id } = request.params;
    const record = await accountAccessRecordsService.updateRecord(id, request.body);

    return {
      code: 0,
      message: '操作成功',
      data: record
    };
  },

  /**
   * Delete record
   * DELETE /account-access/:id
   */
  deleteRecord: async (request, reply) => {
    const { id } = request.params;
    await accountAccessRecordsService.deleteRecord(id);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Batch delete records
   * POST /account-access/batch-delete
   */
  batchDeleteRecords: async (request, reply) => {
    const { ids } = request.body || {};

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return {
        code: 10001,
        message: '请选择要删除的账号',
        data: null
      };
    }

    await accountAccessRecordsService.batchDeleteRecords(ids);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Record a view for the given account
   * POST /account-access/:id/view
   */
  recordView: async (request, reply) => {
    const { id } = request.params;
    const record = await accountAccessRecordsService.recordView(id);

    if (!record) {
      return {
        code: 10001,
        message: '账号不存在',
        data: null
      };
    }

    return {
      code: 0,
      message: '查看成功',
      data: record
    };
  },

  backRecord: async (request, reply) => {
    const { id } = request.params;
    let res = await accountAccessRecordsService.backRecord(id);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  }
};
