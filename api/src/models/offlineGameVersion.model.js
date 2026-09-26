import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

export class OfflineGameVersionModel extends BaseModel {
  constructor() {
    super('offline_game_version');
  }

  async getVersionsWithFilters(filters = {}, page = 1, limit = 10) {
    const db = getDatabase();
    let query = db('offline_game_version as v')
      .leftJoin('offline_games as g', 'v.game_id', 'g.id')
      .select('v.*', 'g.name as game_name');

    if (filters.game_id) {
      query = query.where('v.game_id', filters.game_id);
    }
    if (filters.name) {
      query = query.where('v.name', 'like', `%${filters.name}%`);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('v.status', filters.status);
    }

    const countQuery = db('offline_game_version as v');
    if (filters.game_id) countQuery.where('v.game_id', filters.game_id);
    if (filters.name) countQuery.where('v.name', 'like', `%${filters.name}%`);
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      countQuery.where('v.status', filters.status);
    }
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('v.id', 'desc').limit(limit).offset(offset);

    return { list: data, total, pageSize: limit, currentPage: page };
  }
}
