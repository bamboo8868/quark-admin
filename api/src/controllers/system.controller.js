import { systemService } from '../services/system.service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

// System rank constants
const SYSTEM_RANK = 10;
const MONITOR_RANK = 11;

/**
 * System Controller - Admin system CRUD operations
 */
export const systemController = {
  // ==================== Auth ====================
  
  /**
   * Login
   * POST /login
   */
  login: async (request, reply) => {
    const { username, password } = request.body;
    
    // Find user
    const user = await systemService.getUserByUsername ? 
      await systemService.getUserByUsername(username) : 
      null;
    
    if (!user) {
      return reply.code(401).send({
        code: 10001,
        message: '用户名或密码错误',
        data: null
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return reply.code(401).send({
        code: 10001,
        message: '用户名或密码错误',
        data: null
      });
    }

    // Generate tokens
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, roles: user.roles?.map(r => r.code) || [] },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    // Get permissions from roles
    const permissions = user.roles?.some(r => r.code === 'admin') ? ['*:*:*'] : 
      ['permission:btn:add', 'permission:btn:edit'];

    return {
      code: 0,
      message: '操作成功',
      data: {
        avatar: user.avatar || 'https://avatars.githubusercontent.com/u/44761321',
        username: user.username,
        nickname: user.nickname,
        roles: user.roles?.map(r => r.code) || [],
        // roles: ['admin'],
        permissions,
        accessToken,
        refreshToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    };
  },

  /**
   * Refresh Token
   * POST /refresh-token
   */
  refreshToken: async (request, reply) => {
    const { refreshToken } = request.body;

    if (!refreshToken) {
      return reply.code(400).send({
        code: 10001,
        message: '请求参数缺失或格式不正确',
        data: {}
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret);
      
      const newAccessToken = jwt.sign(
        { userId: decoded.userId },
        config.jwt.secret,
        { expiresIn: config.jwt.accessExpiresIn }
      );
      
      const newRefreshToken = jwt.sign(
        { userId: decoded.userId, type: 'refresh' },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      return {
        code: 0,
        message: '操作成功',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      };
    } catch (error) {
      return reply.code(401).send({
        code: 10001,
        message: 'Token无效或已过期',
        data: {}
      });
    }
  },

  /**
   * Get Async Routes
   * GET /get-async-routes
   */
  getAsyncRoutes: async (request, reply) => {
    const systemManagementRouter = {
      path: '/system',
      meta: {
        icon: 'ri:settings-3-line',
        title: 'menus.pureSysManagement',
        rank: SYSTEM_RANK
      },
      children: [
        {
          path: '/system/user/index',
          name: 'SystemUser',
          meta: {
            icon: 'ri:admin-line',
            title: 'menus.pureUser',
            roles: ['admin']
          }
        },
        {
          path: '/system/role/index',
          name: 'SystemRole',
          meta: {
            icon: 'ri:admin-fill',
            title: 'menus.pureRole',
            roles: ['admin']
          }
        },
        {
          path: '/system/menu/index',
          name: 'SystemMenu',
          meta: {
            icon: 'ep:menu',
            title: 'menus.pureSystemMenu',
            roles: ['admin']
          }
        },
        {
          path: '/system/dept/index',
          name: 'SystemDept',
          meta: {
            icon: 'ri:git-branch-line',
            title: 'menus.pureDept',
            roles: ['admin']
          }
        }
      ]
    };

    const systemMonitorRouter = {
      path: '/monitor',
      meta: {
        icon: 'ep:monitor',
        title: 'menus.pureSysMonitor',
        rank: MONITOR_RANK
      },
      children: [
        {
          path: '/monitor/online-user',
          component: 'monitor/online/index',
          name: 'OnlineUser',
          meta: {
            icon: 'ri:user-voice-line',
            title: 'menus.pureOnlineUser',
            roles: ['admin']
          }
        },
        {
          path: '/monitor/login-logs',
          component: 'monitor/logs/login/index',
          name: 'LoginLog',
          meta: {
            icon: 'ri:window-line',
            title: 'menus.pureLoginLog',
            roles: ['admin']
          }
        },
        {
          path: '/monitor/operation-logs',
          component: 'monitor/logs/operation/index',
          name: 'OperationLog',
          meta: {
            icon: 'ri:history-fill',
            title: 'menus.pureOperationLog',
            roles: ['admin']
          }
        },
        {
          path: '/monitor/system-logs',
          component: 'monitor/logs/system/index',
          name: 'SystemLog',
          meta: {
            icon: 'ri:file-search-line',
            title: 'menus.pureSystemLog',
            roles: ['admin']
          }
        }
      ]
    };

    return {
      code: 0,
      message: '操作成功',
      data: [systemManagementRouter, systemMonitorRouter]
    };
  },

  // ==================== User Management ====================

  /**
   * Get Users
   * POST /user
   */
  getUsers: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;
    
    const filters = {
      username: body.username,
      status: body.status,
      phone: body.phone,
      deptId: body.deptId
    };

    const result = await systemService.getUsers(filters, page, limit);
    
    return {
      code: 0,
      message: '操作成功',
      data: result
    };
  },

  /**
   * Get User by ID
   * GET /user/:id
   */
  getUserById: async (request, reply) => {
    const { id } = request.params;
    const user = await systemService.getUserById(id);
    
    if (!user) {
      return reply.code(404).send({
        code: 10001,
        message: '用户不存在',
        data: null
      });
    }

    return {
      code: 0,
      message: '操作成功',
      data: user
    };
  },

  /**
   * Create User
   * POST /user/create
   */
  createUser: async (request, reply) => {
    const user = await systemService.createUser(request.body);
    
    return {
      code: 0,
      message: '操作成功',
      data: user
    };
  },

  /**
   * Update User
   * PUT /user/:id
   */
  updateUser: async (request, reply) => {
    const { id } = request.params;
    const user = await systemService.updateUser(id, request.body);
    
    return {
      code: 0,
      message: '操作成功',
      data: user
    };
  },

  /**
   * Delete User
   * DELETE /user/:id
   */
  deleteUser: async (request, reply) => {
    const { id } = request.params;
    await systemService.deleteUser(id);
    
    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Batch Delete Users
   * POST /user/batch-delete
   */
  batchDeleteUsers: async (request, reply) => {
    const { ids } = request.body || {};
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return reply.code(400).send({
        code: 10001,
        message: '请选择要删除的用户',
        data: null
      });
    }
    
    await systemService.batchDeleteUsers(ids);
    
    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Reset User Password
   * PUT /user/:id/reset-password
   */
  resetUserPassword: async (request, reply) => {
    const { id } = request.params;
    const { password } = request.body || {};
    
    if (!password) {
      return reply.code(400).send({
        code: 10001,
        message: '请输入新密码',
        data: null
      });
    }
    
    await systemService.resetUserPassword(id, password);
    
    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Update User Roles
   * PUT /user/:id/roles
   */
  updateUserRoles: async (request, reply) => {
    const { id } = request.params;
    const { roleIds } = request.body || {};
    
    await systemService.updateUserRoles(id, roleIds || []);
    
    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Get All Roles (for dropdown)
   * GET /list-all-role
   */
  getAllRoles: async (request, reply) => {
    const roles = await systemService.getAllRoles();
    
    return {
      code: 0,
      message: '操作成功',
      data: roles
    };
  },

  /**
   * Get User Role IDs
   * POST /list-role-ids
   */
  getRoleIds: async (request, reply) => {
    const { userId } = request.body || {};
    
    if (!userId) {
      return reply.code(400).send({
        code: 10001,
        message: '请求参数缺失或格式不正确',
        data: []
      });
    }

    const roleIds = await systemService.getUserRoleIds(userId);
    
    return {
      code: 0,
      message: '操作成功',
      data: roleIds
    };
  },

  // ==================== Role Management ====================

  /**
   * Get Roles
   * POST /role
   */
  getRoles: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;
    
    const filters = {
      name: body.name,
      status: body.status,
      code: body.code
    };

    const result = await systemService.getRoles(filters, page, limit);
    
    return {
      code: 0,
      message: '操作成功',
      data: result
    };
  },

  /**
   * Get Role by ID
   * GET /role/:id
   */
  getRoleById: async (request, reply) => {
    const { id } = request.params;
    const role = await systemService.getRoleById(id);
    
    if (!role) {
      return reply.code(404).send({
        code: 10001,
        message: '角色不存在',
        data: null
      });
    }

    return {
      code: 0,
      message: '操作成功',
      data: role
    };
  },

  /**
   * Create Role
   * POST /role/create
   */
  createRole: async (request, reply) => {
    const role = await systemService.createRole(request.body);
    
    return {
      code: 0,
      message: '操作成功',
      data: role
    };
  },

  /**
   * Update Role
   * PUT /role/:id
   */
  updateRole: async (request, reply) => {
    const { id } = request.params;
    const role = await systemService.updateRole(id, request.body);
    
    return {
      code: 0,
      message: '操作成功',
      data: role
    };
  },

  /**
   * Delete Role
   * DELETE /role/:id
   */
  deleteRole: async (request, reply) => {
    const { id } = request.params;
    await systemService.deleteRole(id);
    
    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Get Role Menu
   * POST /role-menu
   */
  getRoleMenu: async (request, reply) => {
    const menus = await systemService.getMenus();
    
    return {
      code: 0,
      message: '操作成功',
      data: menus.map(menu => ({
        parentId: menu.parentId,
        id: menu.id,
        menuType: menu.menuType,
        title: menu.title
      }))
    };
  },

  /**
   * Get Role Menu IDs
   * POST /role-menu-ids
   */
  getRoleMenuIds: async (request, reply) => {
    const { id } = request.body || {};
    
    if (!id) {
      return {
        code: 0,
        message: '操作成功',
        data: []
      };
    }

    const menuIds = await systemService.getRoleMenuIds(id);
    
    return {
      code: 0,
      message: '操作成功',
      data: menuIds
    };
  },

  /**
   * Update Role Menus
   * PUT /role/:id/menus
   */
  updateRoleMenus: async (request, reply) => {
    const { id } = request.params;
    const { menuIds } = request.body || {};
    
    await systemService.updateRoleMenus(id, menuIds || []);
    
    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  // ==================== Menu Management ====================

  /**
   * Get Menus
   * POST /menu
   */
  getMenus: async (request, reply) => {
    const menus = await systemService.getMenus();
    
    return {
      code: 0,
      message: '操作成功',
      data: menus
    };
  },

  /**
   * Get Menu Tree
   * GET /menu/tree
   */
  getMenuTree: async (request, reply) => {
    const tree = await systemService.getMenuTree();
    
    return {
      code: 0,
      message: '操作成功',
      data: tree
    };
  },

  /**
   * Get Menu by ID
   * GET /menu/:id
   */
  getMenuById: async (request, reply) => {
    const { id } = request.params;
    const menu = await systemService.getMenuById(id);
    
    if (!menu) {
      return reply.code(404).send({
        code: 10001,
        message: '菜单不存在',
        data: null
      });
    }

    return {
      code: 0,
      message: '操作成功',
      data: menu
    };
  },

  /**
   * Create Menu
   * POST /menu/create
   */
  createMenu: async (request, reply) => {
    const menu = await systemService.createMenu(request.body);
    
    return {
      code: 0,
      message: '操作成功',
      data: menu
    };
  },

  /**
   * Update Menu
   * PUT /menu/:id
   */
  updateMenu: async (request, reply) => {
    const { id } = request.params;
    const menu = await systemService.updateMenu(id, request.body);
    
    return {
      code: 0,
      message: '操作成功',
      data: menu
    };
  },

  /**
   * Delete Menu
   * DELETE /menu/:id
   */
  deleteMenu: async (request, reply) => {
    const { id } = request.params;
    await systemService.deleteMenu(id);
    
    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  // ==================== Department Management ====================

  /**
   * Get Departments
   * POST /dept
   */
  getDepts: async (request, reply) => {
    const depts = await systemService.getDepts();
    
    return {
      code: 0,
      message: '操作成功',
      data: depts
    };
  },

  /**
   * Get Department Tree
   * GET /dept/tree
   */
  getDeptTree: async (request, reply) => {
    const tree = await systemService.getDeptTree();
    
    return {
      code: 0,
      message: '操作成功',
      data: tree
    };
  },

  /**
   * Get Dept by ID
   * GET /dept/:id
   */
  getDeptById: async (request, reply) => {
    const { id } = request.params;
    const dept = await systemService.getDeptById(id);
    
    if (!dept) {
      return reply.code(404).send({
        code: 10001,
        message: '部门不存在',
        data: null
      });
    }

    return {
      code: 0,
      message: '操作成功',
      data: dept
    };
  },

  /**
   * Create Dept
   * POST /dept/create
   */
  createDept: async (request, reply) => {
    const dept = await systemService.createDept(request.body);
    
    return {
      code: 0,
      message: '操作成功',
      data: dept
    };
  },

  /**
   * Update Dept
   * PUT /dept/:id
   */
  updateDept: async (request, reply) => {
    const { id } = request.params;
    const dept = await systemService.updateDept(id, request.body);
    
    return {
      code: 0,
      message: '操作成功',
      data: dept
    };
  },

  /**
   * Delete Dept
   * DELETE /dept/:id
   */
  deleteDept: async (request, reply) => {
    const { id } = request.params;
    await systemService.deleteDept(id);
    
    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  // ==================== Log Management ====================

  /**
   * Get Online Users
   * POST /online-logs
   */
  getOnlineLogs: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;
    
    const filters = { username: body.username };

    const result = await systemService.getOnlineUsers(filters, page, limit);
    
    return { code: 0, message: '操作成功', data: result };
  },

  forceOffline: async (request, reply) => {
    const { id } = request.body || {};
    if (!id) {
      return reply.code(400).send({ code: 10001, message: '缺少用户ID', data: null });
    }
    await systemService.forceOffline(id);
    return { code: 0, message: '已强制下线', data: null };
  },

  getLoginLogs: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;
    
    const filters = {
      username: body.username,
      status: body.status,
      loginTime: body.loginTime
    };

    const result = await systemService.getLoginLogs(filters, page, limit);
    return { code: 0, message: '操作成功', data: result };
  },

  getOperationLogs: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;
    
    const filters = {
      module: body.module,
      status: body.status,
      operatingTime: body.operatingTime
    };

    const result = await systemService.getOperationLogs(filters, page, limit);
    return { code: 0, message: '操作成功', data: result };
  },

  getSystemLogs: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;
    
    const filters = {
      module: body.module,
      requestTime: body.requestTime
    };

    const result = await systemService.getSystemLogs(filters, page, limit);
    return { code: 0, message: '操作成功', data: result };
  },

  getSystemLogDetail: async (request, reply) => {
    const { id } = request.body || {};
    if (!id) {
      return reply.code(400).send({ code: 10001, message: '请求参数缺失或格式不正确', data: null });
    }
    const detail = await systemService.getSystemLogDetail(id);
    if (!detail) {
      return reply.code(404).send({ code: 10001, message: '日志不存在', data: null });
    }
    return { code: 0, message: '操作成功', data: detail };
  },

  batchDeleteLoginLogs: async (request, reply) => {
    const { ids } = request.body || {};
    await systemService.batchDeleteLoginLogs(ids);
    return { code: 0, message: '删除成功', data: null };
  },

  clearLoginLogs: async (request, reply) => {
    await systemService.clearLoginLogs();
    return { code: 0, message: '清空成功', data: null };
  },

  batchDeleteOperationLogs: async (request, reply) => {
    const { ids } = request.body || {};
    await systemService.batchDeleteOperationLogs(ids);
    return { code: 0, message: '删除成功', data: null };
  },

  clearOperationLogs: async (request, reply) => {
    await systemService.clearOperationLogs();
    return { code: 0, message: '清空成功', data: null };
  },

  batchDeleteSystemLogs: async (request, reply) => {
    const { ids } = request.body || {};
    await systemService.batchDeleteSystemLogs(ids);
    return { code: 0, message: '删除成功', data: null };
  },

  clearSystemLogs: async (request, reply) => {
    await systemService.clearSystemLogs();
    return { code: 0, message: '清空成功', data: null };
  },

  // ==================== User Profile ====================

  /**
   * Get Mine (User Profile)
   * GET /mine
   */
  getMine: async (request, reply) => {
    // Get user from token
    const userId = request.user?.userId;
    
    if (!userId) {
      return reply.code(401).send({
        code: 10001,
        message: '未登录',
        data: null
      });
    }

    const user = await systemService.getUserById(userId);
    
    return {
      code: 0,
      message: '操作成功',
      data: {
        avatar: user.avatar || 'https://avatars.githubusercontent.com/u/44761321',
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        description: user.remark || '一个热爱开源的前端工程师'
      }
    };
  },

  /**
   * Get Mine Logs
   * GET /mine-logs
   */
  getMineLogs: async (request, reply) => {
    // Mock data for user logs
    const list = [
      {
        id: 1,
        ip: '192.168.1.1',
        address: '中国河南省信阳市',
        system: 'macOS',
        browser: 'Chrome',
        summary: '账户登录',
        operatingTime: new Date()
      },
      {
        id: 2,
        ip: '192.168.1.2',
        address: '中国广东省深圳市',
        system: 'Windows',
        browser: 'Firefox',
        summary: '绑定了手机号码',
        operatingTime: new Date(Date.now() - 86400000)
      }
    ];

    return {
      code: 0,
      message: '操作成功',
      data: {
        list,
        total: list.length,
        pageSize: 10,
        currentPage: 1
      }
    };
  },

  // ==================== Other ====================

  /**
   * Get Card List
   * POST /get-card-list
   */
  getCardList: async (request, reply) => {
    const banners = [
      'https://tdesign.gtimg.com/tdesign-pro/cloud-server.jpg',
      'https://tdesign.gtimg.com/tdesign-pro/t-sec.jpg',
      'https://tdesign.gtimg.com/tdesign-pro/ssl.jpg',
      'https://tdesign.gtimg.com/tdesign-pro/face-recognition.jpg',
      'https://tdesign.gtimg.com/tdesign-pro/cloud-db.jpg'
    ];

    const names = ['SSL证书', '人脸识别', 'CVM', '云数据库', 'T-Sec 云防火墙'];
    const descriptions = [
      'SSL证书又叫服务器证书，腾讯云为您提供证书的一站式服务',
      '云硬盘为您提供用于CVM的持久性数据块级存储服务',
      '云数据库MySQL为用户提供安全可靠的企业级云数据库服务',
      '腾讯安全云防火墙产品，自主研发的SaaS化防火墙产品',
      '基于腾讯优图强大的面部分析技术'
    ];

    const list = [];
    for (let i = 1; i <= 48; i++) {
      list.push({
        index: i,
        isSetup: Math.random() > 0.5,
        type: Math.floor(Math.random() * 5) + 1,
        banner: banners[Math.floor(Math.random() * banners.length)],
        name: names[Math.floor(Math.random() * names.length)],
        description: descriptions[Math.floor(Math.random() * descriptions.length)]
      });
    }

    return {
      code: 0,
      message: '操作成功',
      data: { list }
    };
  },

  /**
   * Get Map Info
   * GET /get-map-info
   */
  getMapInfo: async (request, reply) => {
    const list = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let i = 0; i < 200; i++) {
      const plateSuffix = chars[Math.floor(Math.random() * chars.length)];
      list.push({
        plateNumber: `豫A${Math.floor(Math.random() * 90000) + 10000}${plateSuffix}`,
        driver: `司机${i + 1}`,
        orientation: Math.floor(Math.random() * 360) + 1,
        lng: parseFloat((113 + Math.random() * 1.1).toFixed(4)),
        lat: parseFloat((34 + Math.random() * 1.1).toFixed(4))
      });
    }

    return {
      code: 0,
      message: '操作成功',
      data: list
    };
  }
};

export default systemController;
