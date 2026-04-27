import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';

/**
 * Role Model
 */
export class RoleModel extends BaseModel {
  constructor() {
    super('roles');
  }

  /**
   * Transform frontend data to database format
   */
  toDbFormat(data) {
    const dbData = {};
    
    const fieldMap = {
      name: 'name',
      code: 'code',
      status: 'status',
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
   * Create role with data mapping
   */
  async create(data) {
    const dbData = this.toDbFormat(data);
    return await super.create(dbData);
  }

  /**
   * Update role with data mapping
   */
  async update(id, data) {
    const dbData = this.toDbFormat(data);
    return await super.update(id, dbData);
  }

  /**
   * Get roles with filters and pagination
   */
  async getRolesWithFilters(filters = {}, page = 1, limit = 10) {
    const { name, status, code } = filters;
    
    let query = this.query();

    if (name) {
      query = query.where('name', 'like', `%${name}%`);
    }
    if (status !== undefined && status !== null && status !== '') {
      query = query.where('status', status);
    }
    if (code) {
      query = query.where('code', code);
    }

    // Get total count
    const countQuery = this.query();
    if (name) countQuery.where('name', 'like', `%${name}%`);
    if (status !== undefined && status !== null && status !== '') countQuery.where('status', status);
    if (code) countQuery.where('code', code);
    
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    // Get paginated results
    const list = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    // Format response
    const formattedList = list.map(role => ({
      id: role.id,
      name: role.name,
      code: role.code,
      status: role.status,
      remark: role.remark,
      createTime: new Date(role.created_at).getTime(),
      updateTime: new Date(role.updated_at).getTime()
    }));

    return {
      list: formattedList,
      total,
      pageSize: limit,
      currentPage: page
    };
  }

  /**
   * Get all roles (for dropdown)
   */
  async getAllRoles() {
    const roles = await this.query()
      .where('status', 1)
      .select('id', 'name');
    
    return roles;
  }

  /**
   * Assign menus to role
   */
  async assignMenus(roleId, menuIds) {
    const db = getDatabase();
    
    return await db.transaction(async (trx) => {
      // Remove existing menus
      await trx('role_menus').where('role_id', roleId).del();
      
      // Insert new menus
      if (menuIds && menuIds.length > 0) {
        const inserts = menuIds.map(menuId => ({
          role_id: roleId,
          menu_id: menuId
        }));
        await trx('role_menus').insert(inserts);
      }
      
      return true;
    });
  }

  /**
   * Get role menu IDs
   */
  async getRoleMenuIds(roleId) {
    const menus = await getDatabase()('role_menus')
      .where('role_id', roleId)
      .select('menu_id');
    
    return menus.map(m => m.menu_id);
  }

  /**
   * Get role menus with details
   */
  async getRoleMenus(roleId) {
    const menus = await getDatabase()('role_menus as rm')
      .join('menus as m', 'rm.menu_id', 'm.id')
      .where('rm.role_id', roleId)
      .select('m.*');
    
    return menus.map(menu => ({
      parentId: menu.parent_id,
      id: menu.id,
      menuType: menu.menu_type,
      title: menu.title
    }));
  }
}

export default new RoleModel();
