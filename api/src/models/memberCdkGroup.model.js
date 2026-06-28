import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

export class MemberCdkGroupModel extends BaseModel {
  constructor() {
    super('member_cdk_group');
  }

  async getGroupsWithFilters(filters = {}, page = 1, limit = 10) {
    const db = getDatabase();
    let query = db('member_cdk_group as g')
      .select('g.*');

    if (filters.name) {
      query = query.where('g.name', 'like', `%${filters.name}%`);
    }
    if (filters.member_level !== undefined && filters.member_level !== null && filters.member_level !== '') {
      query = query.where('g.member_level', filters.member_level);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('g.status', filters.status);
    }

    const countQuery = db('member_cdk_group as g');
    if (filters.name) countQuery.where('g.name', 'like', `%${filters.name}%`);
    if (filters.member_level !== undefined && filters.member_level !== null && filters.member_level !== '') {
      countQuery.where('g.member_level', filters.member_level);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      countQuery.where('g.status', filters.status);
    }
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('g.id', 'desc').limit(limit).offset(offset);

    // For each group, get usage stats
    for (const group of data) {
      const [used] = await db('members_cdk')
        .where('group_id', group.id)
        .where('status', 2)
        .count('* as count');
      group.used_count = parseInt(used.count, 10);
    }

    return { list: data, total, pageSize: limit, currentPage: page };
  }
}
