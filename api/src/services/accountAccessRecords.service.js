import { AccountAccessRecordsModel } from '../models/accountAccessRecords.model.js';

const accountAccessRecordsModel = new AccountAccessRecordsModel();

/**
 * Account Access Records Service - Business logic for account access management
 */
export const accountAccessRecordsService = {
  /**
   * Get records list with filters and pagination
   */
  async getRecords(filters, page, limit) {
    return await accountAccessRecordsModel.getRecordsWithFilters(filters, page, limit);
  },

  /**
   * Get record by ID
   */
  async getRecordById(id) {
    return await accountAccessRecordsModel.findById(id);
  },

  /**
   * Create record
   */
  async createRecord(data) {
    return await accountAccessRecordsModel.create({
      game_name: data.game_name || '',
      account: data.account || '',
      password: data.password || '',
      view_times: JSON.stringify([]),
      view_count_24h: 0
    });
  },

  /**
   * Update record
   */
  async updateRecord(id, data) {
    const updateData = {};
    if (data.game_name !== undefined) updateData.game_name = data.game_name;
    if (data.account !== undefined) updateData.account = data.account;
    if (data.password !== undefined) updateData.password = data.password;
    return await accountAccessRecordsModel.update(id, updateData);
  },

  /**
   * Delete record
   */
  async deleteRecord(id) {
    return await accountAccessRecordsModel.delete(id);
  },

  /**
   * Batch delete records
   */
  async batchDeleteRecords(ids) {
    for (const id of ids) {
      await accountAccessRecordsModel.delete(id);
    }
    return true;
  },

  /**
   * Record a view for the given record
   */
  async recordView(id) {
    return await accountAccessRecordsModel.recordView(id);
  }
};

export default accountAccessRecordsService;
