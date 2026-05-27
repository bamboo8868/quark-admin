import { BaseModel } from './base.model.js';

/**
 * Email Account Model
 */
export class EmailAccountModel extends BaseModel {
  constructor() {
    super('email_accounts');
  }

  /**
   * Find all accounts for a user
   */
  async findByUserId(userId) {
    return await this.query()
    //   .where('user_id', userId)
      .orderBy('id', 'asc');
  }

  /**
   * Find account by ID and user ID (ensures ownership)
   */
  async findByIdAndUserId(id, userId) {
    return await this.query()
      .where('id', id)
      .where('user_id', userId)
      .first();
  }



  /**
   * Create email account
   */
  async createAccount(data) {
    return await this.create({
      user_id: data.userId,
      host: data.host,
      port: data.port || 993,
      tls: data.tls !== undefined ? data.tls : true,
      username: data.username,
      password: data.password,
      display_name: data.displayName || ''
    });
  }

  /**
   * Update email account
   */
  async updateAccount(id, data) {
    const dbData = {};
    if (data.host !== undefined) dbData.host = data.host;
    if (data.port !== undefined) dbData.port = data.port;
    if (data.tls !== undefined) dbData.tls = data.tls;
    if (data.username !== undefined) dbData.username = data.username;
    if (data.password !== undefined) dbData.password = data.password;
    if (data.displayName !== undefined) dbData.display_name = data.displayName;
    return await this.update(id, dbData);
  }

  /**
   * Format account for API response (hide password)
   */
  formatAccount(account) {
    return {
      id: account.id,
      userId: account.user_id,
      host: account.host,
      port: account.port,
      tls: !!account.tls,
      username: account.username,
      displayName: account.display_name,
      createTime: new Date(account.created_at).getTime()
    };
  }
}

export default new EmailAccountModel();
