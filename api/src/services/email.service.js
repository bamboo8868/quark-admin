import emailAccountModel from '../models/email.model.js';
import emailMessageModel from '../models/emailMessage.model.js';
import { log } from '../utils/logger.js';

/**
 * Email Service
 *
 * Access control:
 *   - Account CRUD: only the owner (user_id) can create/update/delete their accounts
 *   - Email list & detail: all authenticated users can view (emails are shared read-only)
 */
export const emailService = {
  /**
   * Get email accounts (all — for dropdown in email list)
   */
  async getEmailAccounts() {
    const accounts = await emailAccountModel.findAll();
    return accounts.data.map(a => emailAccountModel.formatAccount(a));
  },

  /**
   * Get single email account
   */
  async getEmailAccount(id, userId) {
    const account = await emailAccountModel.findByIdAndUserId(id, userId);
    if (!account) return null;
    return emailAccountModel.formatAccount(account);
  },

  /**
   * Create email account
   */
  async createEmailAccount(userId, data) {
    const account = await emailAccountModel.createAccount({
      userId,
      host: data.host,
      port: data.port,
      tls: data.tls,
      username: data.username,
      password: data.password,
      displayName: data.displayName
    });
    return emailAccountModel.formatAccount(account);
  },

  /**
   * Update email account
   */
  async updateEmailAccount(id, userId, data) {
    const account = await emailAccountModel.findByIdAndUserId(id, userId);
    if (!account) return null;
    const updated = await emailAccountModel.updateAccount(id, data);
    return emailAccountModel.formatAccount(updated);
  },

  /**
   * Delete email account
   */
  async deleteEmailAccount(id, userId) {
    const account = await emailAccountModel.findByIdAndUserId(id, userId);
    if (!account) return false;
    return await emailAccountModel.delete(id);
  },

  /**
   * Get email detail by ID (with HTML body)
   * All authenticated users can view emails (read-only)
   */
  async getEmailDetail(emailId) {
    const email = await emailMessageModel.findByIdWithBody(emailId);
    return email;
  },

  /**
   * Get email list from database (synced by worker)
   * All authenticated users can view emails (read-only)
   */
  async fetchEmails(accountId, options = {}) {
    const { limit = 50, page = 1, subject, gameAccount } = options;

    let result;
    if (accountId) {
      // Single account
      result = await emailMessageModel.findByAccountId(accountId, {
        limit, page, subject, gameAccount
      });
    } else {
      // All accounts
      const accounts = await emailAccountModel.findAll();
      const accountIds = accounts.data.map(a => a.id);
      if (!accountIds.length) {
        return { code: 10001, message: '未找到邮箱账号配置', data: null };
      }
      result = await emailMessageModel.findByAccountIds(accountIds, {
        limit, page, subject, gameAccount
      });
    }

    return {
      code: 0,
      message: '操作成功',
      data: {
        list: result.list,
        total: result.total,
        pageSize: result.pageSize,
        currentPage: result.currentPage,
        accountId: accountId || null
      }
    };
  }
};
