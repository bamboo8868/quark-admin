import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

export class OfflineLogModel extends BaseModel {
  constructor() {
    super('offline_log');
  }

  async getLogsWithFilters(filters = {}, page = 1, limit = 10) {
    const db = getDatabase();
    let query = db('offline_log as l')
      .leftJoin('offline_cdk as c', 'l.cdk_id', 'c.id')
      .select('l.*', 'c.status as cdk_status', 'c.used_at');

    if (filters.game_id) {
      query = query.where('l.game_id', filters.game_id);
    }
    if (filters.version_id) {
      query = query.where('l.version_id', filters.version_id);
    }
    if (filters.username) {
      query = query.where('l.username', 'like', `%${filters.username}%`);
    }
    if (filters.cdk_code) {
      query = query.where('l.cdk_code', 'like', `%${filters.cdk_code}%`);
    }
    if (filters.account) {
      query = query.where('l.account', 'like', `%${filters.account}%`);
    }
    if (filters.start_date) {
      query = query.where('l.created_at', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('l.created_at', '<=', filters.end_date);
    }

    const countQuery = db('offline_log as l');
    if (filters.game_id) countQuery.where('l.game_id', filters.game_id);
    if (filters.version_id) countQuery.where('l.version_id', filters.version_id);
    if (filters.cdk_code) countQuery.where('l.cdk_code', 'like', `%${filters.cdk_code}%`);
    if (filters.account) countQuery.where('l.account', 'like', `%${filters.account}%`);
    if (filters.username) countQuery.where('l.username', 'like', `%${filters.username}%`);
    if (filters.start_date) countQuery.where('l.created_at', '>=', filters.start_date);
    if (filters.end_date) countQuery.where('l.created_at', '<=', filters.end_date);
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('l.id', 'desc').limit(limit).offset(offset);

    return { list: data, total, pageSize: limit, currentPage: page };
  }
}
