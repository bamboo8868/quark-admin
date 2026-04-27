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
      password: 'password',
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
    return await super.create(dbData);
  }

  /**
   * Update user with data mapping
   */
  async update(id, data) {
    const dbData = this.toDbFormat(data);
    return await super.update(id, dbData);
  }

  /**
   * Find user with roles
   */
  async findWithRoles(id) {
    const user = await this.findById(id);
    if (!user) return null;

    const roles = await getDatabase()('user_roles as ur')
      .join('roles as r', 'ur.role_id', 'r.id')
      .where('ur.user_id', id)
      .select('r.id', 'r.name', 'r.code');

    return { ...user, roles };
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    return await this.findOne({ username });
  }

  /**
   * Find user by username with roles
   */
  async findByUsernameWithRoles(username) {
    const user = await this.findByUsername(username);
    if (!user) return null;

    const roles = await getDatabase()('user_roles as ur')
      .join('roles as r', 'ur.role_id', 'r.id')
      .where('ur.user_id', user.id)
      .select('r.id', 'r.name', 'r.code');

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
   * Assign roles to user
   */
  async assignRoles(userId, roleIds) {
    const db = getDatabase();
    
    return await db.transaction(async (trx) => {
      // Remove existing roles
      await trx('user_roles').where('user_id', userId).del();
      
      // Insert new roles
      if (roleIds && roleIds.length > 0) {
        const inserts = roleIds.map(roleId => ({
          user_id: userId,
          role_id: roleId
        }));
        await trx('user_roles').insert(inserts);
      }
      
      return true;
    });
  }

  /**
   * Get user role IDs
   */
  async getUserRoleIds(userId) {
    const roles = await getDatabase()('user_roles')
      .where('user_id', userId)
      .select('role_id');
    
    return roles.map(r => r.role_id);
  }
}

export default new UserModel();
