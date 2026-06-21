import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

export class RentCdkGroupModel extends BaseModel {
  constructor() {
    super('rent_cdk_group');
  }

  async getGroupsWithFilters(filters = {}, page = 1, limit = 10) {
    const db = getDatabase();
    let query = db('rent_cdk_group as g')
      .leftJoin('rent_games as rg', 'g.game_id', 'rg.id')
      .select(
        'g.*',
        'rg.name as game_name'
      );

    if (filters.game_id) {
      query = query.where('g.game_id', filters.game_id);
    }
    if (filters.name) {
      query = query.where('g.name', 'like', `%${filters.name}%`);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('g.status', filters.status);
    }

    const countQuery = db('rent_cdk_group as g');
    if (filters.game_id) countQuery.where('g.game_id', filters.game_id);
    if (filters.name) countQuery.where('g.name', 'like', `%${filters.name}%`);
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      countQuery.where('g.status', filters.status);
    }
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('g.id', 'desc').limit(limit).offset(offset);

    // For each group, get usage stats
    for (const group of data) {
      const [used] = await db('rent_cdk')
        .where('group_id', group.id)
        .where('status', 1)
        .count('* as count');
      group.used_count = parseInt(used.count, 10);
    }

    return { list: data, total, pageSize: limit, currentPage: page };
  }
}
