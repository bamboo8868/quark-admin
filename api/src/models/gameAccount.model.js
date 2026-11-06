import { BaseModel } from './base.model.js';
import db from '../utils/db.js';
import SteamTotp from 'steam-totp';

/**
 * GameAccount Model - game account management (game_account table)
 */
export class GameAccountModel extends BaseModel {
  constructor() {
    super('game_account');
  }

  /**
   * Get game accounts with filters and pagination
   */
  async getAccountsWithFilters(filters = {}, page = 1, limit = 10) {
    let query = db('game_account as ga')
      .leftJoin('games as g', 'ga.game_id', 'g.id');

    if (filters.account) {
      query = query.where('ga.account', 'like', `%${filters.account}%`);
    }
    if (filters.game_id !== undefined && filters.game_id !== null && filters.game_id !== '') {
      query = query.where('ga.game_id', filters.game_id);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('ga.status', filters.status);
    }
    if (filters.platform) {
      query = query.where('ga.platform', 'like', `%${filters.platform}%`);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const list = await query
      .select(
        'ga.*',
        'g.name as game_name'
      )
      .orderBy('ga.id', 'desc')
      .limit(limit)
      .offset(offset);

    // 列表展示动态码（由 secret 生成），secret 保留供编辑回填
    for (const item of list) {
      try {
        item.totp_code = item.secret ? SteamTotp.generateAuthCode(item.secret) : '';
      } catch (err) {
        item.totp_code = '';
      }
    }

    return {
      list,
      total,
      pageSize: limit,
      currentPage: page
    };
  }

  /**
   * Find by account name
   */
  async findByAccount(account) {
    return await this.query().where('account', account).first();
  }
}
