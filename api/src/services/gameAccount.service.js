import { GameAccountModel } from '../models/gameAccount.model.js';
import { sdaArchiveService } from './sdaArchive.service.js';
import db from '../utils/db.js';

const gameAccountModel = new GameAccountModel();

/**
 * Game Account Service (game_account table)
 */
export const gameAccountService = {
  async getAccounts(filters, page, limit) {
    return await gameAccountModel.getAccountsWithFilters(filters, page, limit);
  },

  async getAccountById(id) {
    return await gameAccountModel.findById(id);
  },

  async createAccount(data) {
    // 匹配到总SDA账号表时自动带出密钥（game_account 密钥列为 secret）
    if (!data.secret) {
      const secret = await sdaArchiveService.getSecretByAccountName(data.account);
      if (secret) data.secret = secret;
    }
    return await gameAccountModel.create(data);
  },

  async updateAccount(id, data) {
    // Hash password if provided and non-empty
    if (data.password !== undefined && data.password !== '') {
      // Store password as-is (game passwords may need plaintext retrieval)
    } else {
      delete data.password;
    }
    return await gameAccountModel.update(id, data);
  },

  async deleteAccount(id) {
    return await gameAccountModel.delete(id);
  },

  async batchDeleteAccounts(ids) {
    return await db('game_account').whereIn('id', ids).delete();
  }
};

export default gameAccountService;
