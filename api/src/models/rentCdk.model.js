import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

export class RentCdkModel extends BaseModel {
  constructor() {
    super('rent_cdk');
  }

  async getCdksWithFilters(filters = {}, page = 1, limit = 10) {
    const db = getDatabase();
    let query = db('rent_cdk as c')
      .leftJoin('rent_games as g', 'c.game_id', 'g.id')
      .leftJoin('rent_game_account as a', 'c.account_id', 'a.id')
      .select(
        'c.*',
        'g.name as game_name',
        'a.account as game_account',
        'a.password as game_password'
      );

    if (filters.game_id) {
      query = query.where('c.game_id', filters.game_id);
    }
    if (filters.group_id) {
      query = query.where('c.group_id', filters.group_id);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('c.status', filters.status);
    }
    if (filters.cdk_code) {
      query = query.where('c.cdk_code', 'like', `%${filters.cdk_code}%`);
    }
    if (filters.account) {
      query = query.where('a.account', 'like', `%${filters.account}%`);
    }

    const countQuery = query.clone().clearSelect();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('c.id', 'desc').limit(limit).offset(offset);

    return { list: data, total, pageSize: limit, currentPage: page };
  }
}
