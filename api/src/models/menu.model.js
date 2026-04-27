import { BaseModel } from './base.model.js';

/**
 * Menu Model
 */
export class MenuModel extends BaseModel {
  constructor() {
    super('menus');
  }

  /**
   * Get all menus in tree structure
   */
  async getMenuTree() {
    const menus = await this.query()
      .orderBy('rank', 'asc')
      .orderBy('id', 'asc');
    
    return this.buildTree(menus);
  }

  /**
   * Get all menus as flat list
   */
  async getAllMenus() {
    const menus = await this.query()
      .orderBy('rank', 'asc')
      .orderBy('id', 'asc');
    
    return menus.map(menu => this.formatMenu(menu));
  }

  /**
   * Get menus by role IDs
   */
  async getMenusByRoleIds(roleIds) {
    if (!roleIds || roleIds.length === 0) return [];
    
    const { getDatabase } = await import('../config/database.js');
    const menus = await getDatabase()('role_menus as rm')
      .join('menus as m', 'rm.menu_id', 'm.id')
      .whereIn('rm.role_id', roleIds)
      .distinct('m.*')
      .orderBy('m.rank', 'asc')
      .orderBy('m.id', 'asc');
    
    return menus.map(menu => this.formatMenu(menu));
  }

  /**
   * Build tree structure from flat list
   */
  buildTree(menus, parentId = 0) {
    const result = [];
    
    for (const menu of menus) {
      if (menu.parent_id === parentId) {
        const children = this.buildTree(menus, menu.id);
        const formatted = this.formatMenu(menu);
        if (children.length > 0) {
          formatted.children = children;
        }
        result.push(formatted);
      }
    }
    
    return result;
  }

  /**
   * Create menu with camelCase-to-snake_case mapping
   */
  async createMenu(data) {
    const dbData = this.toDbFormat(data);
    const [id] = await this.query().insert(dbData);
    return this.findById(id);
  }

  /**
   * Update menu with camelCase-to-snake_case mapping
   */
  async updateMenu(id, data) {
    const dbData = this.toDbFormat(data);
    await this.query().where('id', id).update({
      ...dbData,
      updated_at: new Date()
    });
    return this.findById(id);
  }

  /**
   * Delete menu by ID (hard delete)
   */
  async deleteMenu(id) {
    return await this.query().where('id', id).del();
  }

  /**
   * Convert camelCase frontend data to snake_case for database
   */
  toDbFormat(data) {
    const mapping = {
      parentId: 'parent_id',
      menuType: 'menu_type',
      title: 'title',
      name: 'name',
      path: 'path',
      component: 'component',
      rank: 'rank',
      redirect: 'redirect',
      icon: 'icon',
      extraIcon: 'extra_icon',
      enterTransition: 'enter_transition',
      leaveTransition: 'leave_transition',
      activePath: 'active_path',
      auths: 'auths',
      frameSrc: 'frame_src',
      frameLoading: 'frame_loading',
      keepAlive: 'keep_alive',
      hiddenTag: 'hidden_tag',
      fixedTag: 'fixed_tag',
      showLink: 'show_link',
      showParent: 'show_parent'
    };

    const result = {};
    for (const [key, dbKey] of Object.entries(mapping)) {
      if (data[key] !== undefined) {
        result[dbKey] = data[key];
      }
    }
    return result;
  }

  /**
   * Format menu for response
   */
  formatMenu(menu) {
    return {
      parentId: menu.parent_id,
      id: menu.id,
      menuType: menu.menu_type,
      title: menu.title,
      name: menu.name,
      path: menu.path,
      component: menu.component,
      rank: menu.rank,
      redirect: menu.redirect,
      icon: menu.icon,
      extraIcon: menu.extra_icon,
      enterTransition: menu.enter_transition,
      leaveTransition: menu.leave_transition,
      activePath: menu.active_path,
      auths: menu.auths,
      frameSrc: menu.frame_src,
      frameLoading: menu.frame_loading,
      keepAlive: menu.keep_alive,
      hiddenTag: menu.hidden_tag,
      fixedTag: menu.fixed_tag,
      showLink: menu.show_link,
      showParent: menu.show_parent
    };
  }
}

export default new MenuModel();
