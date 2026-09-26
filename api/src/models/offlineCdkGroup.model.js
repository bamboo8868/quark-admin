import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

export class OfflineCdkGroupModel extends BaseModel {
  constructor() {
    super('offline_cdk_group');
  }

  async getGroupsWithFilters(filters = {}, page = 1, limit = 10) {
    const db = getDatabase();
    let query = db('offline_cdk_group as cg')
      .leftJoin('offline_games as g', 'cg.game_id', 'g.id')
      .leftJoin('offline_game_version as v', 'cg.version_id', 'v.id')
      .select('cg.*', 'g.name as game_name', 'v.name as version_name');

    if (filters.game_id) {
      query = query.where('cg.game_id', filters.game_id);
    }
    if (filters.version_id) {
      query = query.where('cg.version_id', filters.version_id);
    }
    if (filters.name) {
      query = query.where('cg.name', 'like', `%${filters.name}%`);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('cg.status', filters.status);
    }

    const countQuery = db('offline_cdk_group as cg');
    if (filters.game_id) countQuery.where('cg.game_id', filters.game_id);
    if (filters.version_id) countQuery.where('cg.version_id', filters.version_id);
    if (filters.name) countQuery.where('cg.name', 'like', `%${filters.name}%`);
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      countQuery.where('cg.status', filters.status);
    }
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('cg.id', 'desc').limit(limit).offset(offset);

    // For each group, get usage stats
    for (const group of data) {
      const [used] = await db('offline_cdk')
        .where('group_id', group.id)
        .where('status', 1)
        .count('* as count');
      group.used_count = parseInt(used.count, 10);
    }

    return { list: data, total, pageSize: limit, currentPage: page };
  }
}
