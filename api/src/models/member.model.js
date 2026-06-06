import { BaseModel } from './base.model.js';

/**
 * Member Model - front-end registered users
 */
export class MemberModel extends BaseModel {
  constructor() {
    super('members');
  }

  /**
   * Get members with filters and pagination
   */
  async getMembersWithFilters(filters = {}, page = 1, limit = 10) {
    let query = this.query();

    if (filters.username) {
      query = query.where('username', 'like', `%${filters.username}%`);
    }
    if (filters.nickname) {
      query = query.where('nickname', 'like', `%${filters.nickname}%`);
    }
    if (filters.email) {
      query = query.where('email', 'like', `%${filters.email}%`);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('status', filters.status);
    }
    if (filters.member_level !== undefined && filters.member_level !== null && filters.member_level !== '') {
      query = query.where('member_level', filters.member_level);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const list = await query
      .select(
        'id', 'username', 'email', 'phone', 'nickname', 'avatar',
        'gender', 'birthday', 'signature',
        'member_level', 'member_expire_at',
        'status', 'email_verified',
        'last_login_at', 'last_login_ip', 'login_count',
        'created_at', 'updated_at'
      )
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
   * Find by username
   */
  async findByUsername(username) {
    return await this.query().where('username', username).first();
  }

  /**
   * Find by email
   */
  async findByEmail(email) {
    return await this.query().where('email', email).first();
  }
}
