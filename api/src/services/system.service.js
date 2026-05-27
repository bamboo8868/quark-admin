import { UserModel } from '../models/user.model.js';
import { RoleModel } from '../models/role.model.js';
import { DeptModel } from '../models/dept.model.js';
import { LoginLogModel, OperationLogModel, SystemLogModel, OnlineUserModel } from '../models/log.model.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// Initialize models
const userModel = new UserModel();
const roleModel = new RoleModel();
const deptModel = new DeptModel();
const loginLogModel = new LoginLogModel();
const operationLogModel = new OperationLogModel();
const systemLogModel = new SystemLogModel();
const onlineUserModel = new OnlineUserModel();

/**
 * System Service - Business logic for admin system
 */
export const systemService = {
  // ==================== User Management ====================
  
  /**
   * Get users list with filters
   */
  async getUsers(filters, page, limit) {
    return await userModel.getUsersWithFilters(filters, page, limit);
  },

  /**
   * Get user by ID
   */
  async getUserById(id) {
    return await userModel.findWithRoles(id);
  },

  /**
   * Create user
   */
  async createUser(data) {
    // Set defaults for required fields
    const userData = {
      nickname: '',
      email: '',
      phone: '',
      avatar: '',
      remark: '',
      status: 1,
      sex: 0,
      deptId: 0,
      ...data
    };

    // Convert empty strings to defaults for numeric fields
    if (userData.sex === '' || userData.sex === null) {
      userData.sex = 0;
    }
    if (userData.status === '' || userData.status === null) {
      userData.status = 1;
    }
    if (userData.deptId === '' || userData.deptId === null) {
      userData.deptId = 0;
    }

    // Hash password
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const user = await userModel.create(userData);
    return user;
  },

  /**
   * Update user
   */
  async updateUser(id, data) {
    // Convert empty strings to defaults for numeric fields
    if (data.sex === '' || data.sex === null) {
      data.sex = 0;
    }
    if (data.status === '' || data.status === null) {
      data.status = 1;
    }
    if (data.deptId === '' || data.deptId === null) {
      data.deptId = 0;
    }

    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    
    const user = await userModel.update(id, data);
    return user;
  },

  /**
   * Delete user
   */
  async deleteUser(id) {
    return await userModel.softDelete(id);
  },

  /**
   * Batch delete users
   */
  async batchDeleteUsers(ids) {
    for (const id of ids) {
      await userModel.softDelete(id);
    }
    return true;
  },

  /**
   * Reset user password
   */
  async resetUserPassword(id, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return await userModel.update(id, { password: hashedPassword });
  },

  /**
   * Get user by username
   */
  async getUserByUsername(username) {
    return await userModel.findByUsernameWithRoles(username);
  },

  /**
   * Get user role IDs (from department)
   */
  async getUserRoleIds(userId) {
    return await userModel.getUserRoleIds(userId);
  },

  // ==================== Role Management ====================
  
  /**
   * Get roles list with filters
   */
  async getRoles(filters, page, limit) {
    return await roleModel.getRolesWithFilters(filters, page, limit);
  },

  /**
   * Get all roles (for dropdown)
   */
  async getAllRoles() {
    return await roleModel.getAllRoles();
  },

  /**
   * Get role by ID
   */
  async getRoleById(id) {
    return await roleModel.findById(id);
  },

  /**
   * Create role
   */
  async createRole(data) {
    const role = await roleModel.create(data);
    
    // Assign menus if provided
    if (data.menuIds && data.menuIds.length > 0) {
      await roleModel.assignMenus(role.id, data.menuIds);
    }
    
    return role;
  },

  /**
   * Update role
   */
  async updateRole(id, data) {
    const role = await roleModel.update(id, data);
    
    // Update menus if provided
    if (data.menuIds) {
      await roleModel.assignMenus(id, data.menuIds);
    }
    
    return role;
  },

  /**
   * Delete role
   */
  async deleteRole(id) {
    return await roleModel.delete(id);
  },

  /**
   * Get role menus
   */
  async getRoleMenus(roleId) {
    return await roleModel.getRoleMenus(roleId);
  },

  /**
   * Get role menu IDs
   */
  async getRoleMenuIds(roleId) {
    return await roleModel.getRoleMenuIds(roleId);
  },

  /**
   * Update role menus
   */
  async updateRoleMenus(roleId, menuIds) {
    return await roleModel.assignMenus(roleId, menuIds);
  },

  // ==================== Department Management ====================
  
  /**
   * Get all departments
   */
  async getDepts() {
    return await deptModel.getAllDepts();
  },

  /**
   * Get department tree
   */
  async getDeptTree() {
    return await deptModel.getDeptTree();
  },

  /**
   * Get department by ID
   */
  async getDeptById(id) {
    return await deptModel.findById(id);
  },

  /**
   * Create department
   */
  async createDept(data) {
    return await deptModel.create(data);
  },

  /**
   * Update department
   */
  async updateDept(id, data) {
    return await deptModel.update(id, data);
  },

  /**
   * Delete department
   */
  async deleteDept(id) {
    return await deptModel.delete(id);
  },

  // ==================== Log Management ====================
  
  /**
   * Get login logs
   */
  async getLoginLogs(filters, page, limit) {
    return await loginLogModel.getLogs(filters, page, limit);
  },

  /**
   * Get operation logs
   */
  async getOperationLogs(filters, page, limit) {
    return await operationLogModel.getLogs(filters, page, limit);
  },

  /**
   * Get system logs
   */
  async getSystemLogs(filters, page, limit) {
    return await systemLogModel.getLogs(filters, page, limit);
  },

  /**
   * Get system log detail
   */
  async getSystemLogDetail(id) {
    return await systemLogModel.getDetail(id);
  },

  /**
   * Get online users
   */
  async getOnlineUsers(filters, page, limit) {
    return await onlineUserModel.getUsers(filters, page, limit);
  },

  async forceOffline(id) {
    return await onlineUserModel.query().where('id', id).del();
  },

  async batchDeleteLoginLogs(ids) {
    return await loginLogModel.batchDelete(ids);
  },

  async clearLoginLogs() {
    return await loginLogModel.clearAll();
  },

  async batchDeleteOperationLogs(ids) {
    return await operationLogModel.batchDelete(ids);
  },

  async clearOperationLogs() {
    return await operationLogModel.clearAll();
  },

  async batchDeleteSystemLogs(ids) {
    return await systemLogModel.batchDelete(ids);
  },

  async clearSystemLogs() {
    return await systemLogModel.clearAll();
  },

  // ==================== User Profile ====================

  /**
   * Update user profile (nickname, email, phone, avatar, description)
   */
  async updateProfile(userId, data) {
    const updateData = {};
    if (data.nickname !== undefined) updateData.nickname = data.nickname;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.description !== undefined) updateData.remark = data.description;

    await userModel.update(userId, updateData);
    return await userModel.findWithRoles(userId);
  },

  /**
   * Change password — verify old password, then update
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      throw new Error('原密码错误');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userModel.update(userId, { password: hashedPassword });
    return true;
  },

  /**
   * Get user's login logs for security log
   */
  async getMineLogs(userId, page = 1, limit = 10) {
    const user = await userModel.findById(userId);
    if (!user) {
      return { list: [], total: 0, pageSize: limit, currentPage: page };
    }
    return await loginLogModel.getLogs({ username: user.username }, page, limit);
  }
};

export default systemService;
