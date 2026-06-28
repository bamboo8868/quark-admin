import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

export class MemberCdkLogModel extends BaseModel {
  constructor() {
    super('member_cdk_log');
  }

  async getLogsWithFilters(filters = {}, page = 1, limit = 10) {
    const db = getDatabase();
    let query = db('member_cdk_log as l')
      .leftJoin('members_cdk as c', 'l.cdk_id', 'c.id')
      .select('l.*', 'c.status as cdk_status', 'c.used_at');

    if (filters.action) {
      query = query.where('l.action', filters.action);
    }
    if (filters.cdk_code) {
      query = query.where('l.cdk_code', 'like', `%${filters.cdk_code}%`);
    }
    if (filters.member_name) {
      query = query.where('l.member_name', 'like', `%${filters.member_name}%`);
    }
    if (filters.member_level !== undefined && filters.member_level !== null && filters.member_level !== '') {
      query = query.where('l.member_level', filters.member_level);
    }
    if (filters.start_date) {
      query = query.where('l.created_at', '>=', filters.start_date);
    }
    if (filters.end_date) {
      query = query.where('l.created_at', '<=', filters.end_date);
    }

    const countQuery = db('member_cdk_log as l');
    if (filters.action) countQuery.where('l.action', filters.action);
    if (filters.cdk_code) countQuery.where('l.cdk_code', 'like', `%${filters.cdk_code}%`);
    if (filters.member_name) countQuery.where('l.member_name', 'like', `%${filters.member_name}%`);
    if (filters.member_level !== undefined && filters.member_level !== null && filters.member_level !== '') {
      countQuery.where('l.member_level', filters.member_level);
    }
    if (filters.start_date) countQuery.where('l.created_at', '>=', filters.start_date);
    if (filters.end_date) countQuery.where('l.created_at', '<=', filters.end_date);
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('l.id', 'desc').limit(limit).offset(offset);

    return { list: data, total, pageSize: limit, currentPage: page };
  }
}
