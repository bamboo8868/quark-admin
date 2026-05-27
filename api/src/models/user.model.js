import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

/**
 * User Model
 */
export class UserModel extends BaseModel {
  constructor() {
    super('users');
  }

  /**
   * Transform frontend data to database format
   */
  toDbFormat(data) {
    const dbData = {};
    
    const fieldMap = {
      username: 'username',
      nickname: 'nickname',
      email: 'email',
      phone: 'phone',
      avatar: 'avatar',
      sex: 'sex',
      status: 'status',
      deptId: 'dept_id',
      remark: 'remark'
    };

    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        dbData[dbKey] = data[key];
      }
    }

    return dbData;
  }

  /**
   * Create user with data mapping
   */
  async create(data) {
    const dbData = this.toDbFormat(data);
    // Include password separately (not in toDbFormat to avoid overwrite on update)
    if (data.password !== undefined) {
      dbData.password = data.password;
    }
    return await super.create(dbData);
  }

  /**
   * Update user with data mapping
   * Password is excluded from toDbFormat to prevent accidental overwrite;
   * use resetPassword() or pass { password } explicitly for password changes.
   */
  async update(id, data) {
    const dbData = this.toDbFormat(data);
    // Allow password update only when explicitly provided (e.g. reset-password endpoint)
    if (data.password !== undefined) {
      dbData.password = data.password;
    }
    return await super.update(id, dbData);
  }

  /**
   * Find user with roles (from department only)
   */
  async findWithRoles(id) {
    const user = await this.findById(id);
    if (!user) return null;
  
    // Get roles from user's department via dept.role_ids
    let roles = [];
    if (user.dept_id) {
      const dept = await getDatabase()('depts').where('id', user.dept_id).first();
      if (dept && dept.role_ids) {
        try {
          const deptRoleIds = JSON.parse(dept.role_ids);
          if (Array.isArray(deptRoleIds) && deptRoleIds.length > 0) {
            roles = await getDatabase()('roles')
              .whereIn('id', deptRoleIds)
              .where('status', 1)
              .select('id', 'name', 'code');
          }
        } catch {
          // Invalid JSON in role_ids, skip
        }
      }
    }
  
    return { ...user, roles };
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    return await this.findOne({ username });
  }

  /**
   * Find user by username with roles (from department only)
   */
  async findByUsernameWithRoles(username) {
    const user = await this.findByUsername(username);
    if (!user) return null;
  
    // Get roles from user's department via dept.role_ids
    let roles = [];
    if (user.dept_id) {
      const dept = await getDatabase()('depts').where('id', user.dept_id).first();
      if (dept && dept.role_ids) {
        try {
          const deptRoleIds = JSON.parse(dept.role_ids);
          if (Array.isArray(deptRoleIds) && deptRoleIds.length > 0) {
            roles = await getDatabase()('roles')
              .whereIn('id', deptRoleIds)
              .where('status', 1)
              .select('id', 'name', 'code');
          }
        } catch {
          // Invalid JSON in role_ids, skip
        }
      }
    }
  
    return { ...user, roles };
  }

  /**
   * Get users with filters and pagination
   */
  async getUsersWithFilters(filters = {}, page = 1, limit = 10) {
    const { username, status, phone, deptId } = filters;
    
    let query = this.query()
      .leftJoin('depts as d', 'users.dept_id', 'd.id')
      .select(
        'users.*',
        'd.name as dept_name',
        'd.id as dept_id'
      );

    if (username) {
      query = query.where('users.username', 'like', `%${username}%`);
    }
    if (status !== undefined && status !== null && status !== '') {
      query = query.where('users.status', status);
    }
    if (phone) {
      query = query.where('users.phone', phone);
    }
    if (deptId !== undefined && deptId !== null && deptId !== '') {
      query = query.where('users.dept_id', deptId);
    }

    // Get total count
    const countQuery = this.query();
    if (username) countQuery.where('username', 'like', `%${username}%`);
    if (status !== undefined && status !== null && status !== '') countQuery.where('status', status);
    if (phone) countQuery.where('phone', phone);
    if (deptId !== undefined && deptId !== null && deptId !== '') countQuery.where('dept_id', deptId);
    
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    // Get paginated results
    const list = await query
      .orderBy('users.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    // Format response
    const formattedList = list.map(user => ({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      sex: user.sex,
      status: user.status,
      dept: user.dept_id ? { id: user.dept_id, name: user.dept_name } : null,
      remark: user.remark,
      createTime: new Date(user.created_at).getTime()
    }));

    return {
      list: formattedList,
      total,
      pageSize: limit,
      currentPage: page
    };
  }

  /**
   * Get user role IDs from department
   */
  async getUserRoleIds(userId) {
    const user = await this.findById(userId);
    if (!user || !user.dept_id) return [];

    const dept = await getDatabase()('depts').where('id', user.dept_id).first();
    if (!dept || !dept.role_ids) return [];

    try {
      const deptRoleIds = JSON.parse(dept.role_ids);
      return Array.isArray(deptRoleIds) ? deptRoleIds : [];
    } catch {
      return [];
    }
  }
}

export default new UserModel();
