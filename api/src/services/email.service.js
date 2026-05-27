import emailAccountModel from '../models/email.model.js';
import emailMessageModel from '../models/emailMessage.model.js';
import { log } from '../utils/logger.js';

/**
 * Email Service
 */
export const emailService = {
  /**
   * Get email accounts for a user
   */
  async getEmailAccounts(userId) {
    let accounts = await emailAccountModel.findAll();
    accounts = accounts.data;
    // const accounts = await emailAccountModel.findByUserId(userId);
    return accounts.map(a => emailAccountModel.formatAccount(a));
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
   * Verifies the email belongs to a user's account
   */
  async getEmailDetail(userId, emailId) {
    const email = await emailMessageModel.findByIdWithBody(emailId);
    if (!email) return null;

    // Verify ownership: email's account must belong to this user
    const account = await emailAccountModel.findByIdAndUserId(email.accountId, userId);
    if (!account) return null;

    return email;
  },

  /**
   * Get email list from database (synced by cron worker)
   */
  async fetchEmails(userId, accountId, options = {}) {
    const { limit = 50, page = 1, subject, gameAccount } = options;

    // Get all user accounts
    const userAccounts = await emailAccountModel.findByUserId(userId);
    if (!userAccounts.length) {
      return { code: 10001, message: '未找到邮箱账号配置', data: null };
    }

    let result;
    if (accountId) {
      // Single account — verify ownership
      const account = userAccounts.find(a => a.id === accountId);
      if (!account) {
        return { code: 10001, message: '未找到邮箱账号配置', data: null };
      }
      result = await emailMessageModel.findByAccountId(account.id, {
        limit, page, subject, gameAccount
      });
    } else {
      // All accounts
      const accountIds = userAccounts.map(a => a.id);
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
        accountId: accountId || null,
        accountName: accountId
          ? (userAccounts.find(a => a.id === accountId)?.display_name || userAccounts.find(a => a.id === accountId)?.username)
          : '全部账号'
      }
    };
  }
};
