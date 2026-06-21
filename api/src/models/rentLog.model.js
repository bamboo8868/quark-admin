import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

export class RentLogModel extends BaseModel {
  constructor() {
    super('rent_log');
  }

  async getLogsWithFilters(filters = {}, page = 1, limit = 10) {
    const db = getDatabase();
    let query = db('rent_log as l')
      .leftJoin('rent_cdk as c', 'l.cdk_id', 'c.id')
      .select('l.*', 'c.status as cdk_status', 'c.used_at');

    if (filters.game_id) {
      query = query.where('l.game_id', filters.game_id);
    }
    if (filters.action) {
      query = query.where('l.action', filters.action);
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

    const countQuery = db('rent_log as l');
    if (filters.game_id) {
      countQuery.where('l.game_id', filters.game_id);
    }
    if (filters.cdk_code) {
      countQuery.where('l.cdk_code', 'like', `%${filters.cdk_code}%`);
    }
    if (filters.account) {
      countQuery.where('l.account', 'like', `%${filters.account}%`);
    }
    if (filters.start_date) {
      countQuery.where('l.created_at', '>=', filters.start_date);
    }
    if (filters.end_date) {
      countQuery.where('l.created_at', '<=', filters.end_date);
    }
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('l.id', 'desc').limit(limit).offset(offset);

    return { list: data, total, pageSize: limit, currentPage: page };
  }
}
