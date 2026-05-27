import { emailService } from '../services/email.service.js';
import { extractUser } from '../middlewares/permission.middleware.js';

/**
 * Email Controller
 */
export const emailController = {
  /**
   * Get email accounts for current user
   * GET /email/accounts
   */
  getEmailAccounts: async (request, reply) => {
    const decoded = extractUser(request);
    const accounts = await emailService.getEmailAccounts(decoded.userId);
    return {
      code: 0,
      message: '操作成功',
      data: accounts
    };
  },

  /**
   * Get single email account
   * GET /email/accounts/:id
   */
  getEmailAccount: async (request, reply) => {
    const decoded = extractUser(request);
    const { id } = request.params;
    const account = await emailService.getEmailAccount(id, decoded.userId);
    if (!account) {
      return { code: 10001, message: '未找到邮箱账号', data: null };
    }
    return {
      code: 0,
      message: '操作成功',
      data: account
    };
  },

  /**
   * Create email account
   * POST /email/accounts
   */
  createEmailAccount: async (request, reply) => {
    const decoded = extractUser(request);
    const account = await emailService.createEmailAccount(decoded.userId, request.body);
    return {
      code: 0,
      message: '操作成功',
      data: account
    };
  },

  /**
   * Update email account
   * PUT /email/accounts/:id
   */
  updateEmailAccount: async (request, reply) => {
    const decoded = extractUser(request);
    const { id } = request.params;
    const account = await emailService.updateEmailAccount(id, decoded.userId, request.body);
    if (!account) {
      return { code: 10001, message: '未找到邮箱账号', data: null };
    }
    return {
      code: 0,
      message: '操作成功',
      data: account
    };
  },

  /**
   * Delete email account
   * DELETE /email/accounts/:id
   */
  deleteEmailAccount: async (request, reply) => {
    const decoded = extractUser(request);
    const { id } = request.params;
    const deleted = await emailService.deleteEmailAccount(id, decoded.userId);
    if (!deleted) {
      return { code: 10001, message: '未找到邮箱账号', data: null };
    }
    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Get email list from database
   * POST /email/list
   */
  getEmails: async (request, reply) => {
    const decoded = extractUser(request);
    const { accountId, limit, page, subject, gameAccount } = request.body || {};
    return await emailService.fetchEmails(decoded.userId, accountId || null, {
      limit: limit || 50,
      page: page || 1,
      subject,
      gameAccount
    });
  },

  /**
   * Get email detail with HTML body
   * GET /email/detail/:id
   */
  getEmailDetail: async (request, reply) => {
    const decoded = extractUser(request);
    const { id } = request.params;
    const email = await emailService.getEmailDetail(decoded.userId, id);
    if (!email) {
      return { code: 10001, message: '未找到邮件', data: null };
    }
    return {
      code: 0,
      message: '操作成功',
      data: email
    };
  }
};
