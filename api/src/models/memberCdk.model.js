import { BaseModel } from './base.model.js';

/**
 * MemberCdk Model - CDK codes for membership upgrades
 */
export class MemberCdkModel extends BaseModel {
  constructor() {
    super('members_cdk');
  }

  /**
   * Get CDK list with filters and pagination
   */
  async getCdksWithFilters(filters = {}, page = 1, limit = 10) {
    let query = this.query();

    if (filters.cdk_code) {
      query = query.where('cdk_code', 'like', `%${filters.cdk_code}%`);
    }
    if (filters.member_level !== undefined && filters.member_level !== null && filters.member_level !== '') {
      query = query.where('member_level', filters.member_level);
    }
    if (filters.duration_months !== undefined && filters.duration_months !== null && filters.duration_months !== '') {
      query = query.where('duration_months', filters.duration_months);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('status', filters.status);
    }
    if (filters.batch_no) {
      query = query.where('batch_no', filters.batch_no);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const list = await query
      .select('*')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      list,
      total,
      pageSize: limit,
      currentPage: page
    };
  }

  /**
   * Find by CDK code (exact match)
   */
  async findByCode(cdkCode) {
    return await this.query().where('cdk_code', cdkCode).first();
  }
}
