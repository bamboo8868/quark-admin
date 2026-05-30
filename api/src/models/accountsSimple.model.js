import { BaseModel } from './base.model.js';
import SteamTotp from 'steam-totp';

/**
 * AccountsSimple Model
 * Manages game account records (account + code pairs)
 */
export class AccountsSimpleModel extends BaseModel {
  constructor() {
    super('accounts_simple');
  }

  /**
   * Get accounts with filters and pagination
   */
  async getAccountsWithFilters(filters = {}, page = 1, limit = 10) {
    let query = this.query();

    if (filters.account) {
      query = query.where('account', 'like', `%${filters.account}%`);
    }
    if (filters.visible !== undefined && filters.visible !== null && filters.visible !== '') {
      query = query.where('visible', filters.visible);
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    // Get paginated results
    const offset = (page - 1) * limit;
    const data = await query
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    for (let item of data) {
      item.code = SteamTotp.generateAuthCode(item.code);
    }

    return {
      list: data,
      total,
      pageSize: limit,
      currentPage: page
    };
  }
}
