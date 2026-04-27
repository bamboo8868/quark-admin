import { systemController } from '../controllers/system.controller.js';

/**
 * System routes for admin frontend
 * These routes provide CRUD APIs for admin system
 */
export async function systemRoutes(app) {
  // ==================== Auth ====================
  // Login
  app.post('/login', systemController.login);
  // Refresh token
  app.post('/refresh-token', systemController.refreshToken);
  // Async routes
  app.get('/get-async-routes', systemController.getAsyncRoutes);

  // ==================== User Management ====================
  // Get users list
  app.post('/user', systemController.getUsers);
  // Get user by ID
  app.get('/user/:id', systemController.getUserById);
  // Create user
  app.post('/user/create', systemController.createUser);
  // Update user
  app.put('/user/:id', systemController.updateUser);
  // Delete user
  app.delete('/user/:id', systemController.deleteUser);
  // Batch delete users
  app.post('/user/batch-delete', systemController.batchDeleteUsers);
  // Reset user password
  app.put('/user/:id/reset-password', systemController.resetUserPassword);
  // Update user roles
  app.put('/user/:id/roles', systemController.updateUserRoles);
  // Get all roles (for dropdown)
  app.get('/list-all-role', systemController.getAllRoles);
  // Get user role IDs
  app.post('/list-role-ids', systemController.getRoleIds);

  // ==================== Role Management ====================
  // Get roles list
  app.post('/role', systemController.getRoles);
  // Get role by ID
  app.get('/role/:id', systemController.getRoleById);
  // Create role
  app.post('/role/create', systemController.createRole);
  // Update role
  app.put('/role/:id', systemController.updateRole);
  // Delete role
  app.delete('/role/:id', systemController.deleteRole);
  // Get role menu
  app.post('/role-menu', systemController.getRoleMenu);
  // Get role menu IDs
  app.post('/role-menu-ids', systemController.getRoleMenuIds);
  // Update role menus
  app.put('/role/:id/menus', systemController.updateRoleMenus);

  // ==================== Menu Management ====================
  // Get menus list
  app.post('/menu', systemController.getMenus);
  // Get menu tree
  app.get('/menu/tree', systemController.getMenuTree);
  // Get menu by ID
  app.get('/menu/:id', systemController.getMenuById);
  // Create menu
  app.post('/menu/create', systemController.createMenu);
  // Update menu
  app.put('/menu/:id', systemController.updateMenu);
  // Delete menu
  app.delete('/menu/:id', systemController.deleteMenu);

  // ==================== Department Management ====================
  // Get depts list
  app.post('/dept', systemController.getDepts);
  // Get dept tree
  app.get('/dept/tree', systemController.getDeptTree);
  // Get dept by ID
  app.get('/dept/:id', systemController.getDeptById);
  // Create dept
  app.post('/dept/create', systemController.createDept);
  // Update dept
  app.put('/dept/:id', systemController.updateDept);
  // Delete dept
  app.delete('/dept/:id', systemController.deleteDept);

  // ==================== Log Management ====================
  // Online users
  app.post('/online-logs', systemController.getOnlineLogs);
  // Login logs
  app.post('/login-logs', systemController.getLoginLogs);
  // Operation logs
  app.post('/operation-logs', systemController.getOperationLogs);
  // System logs
  app.post('/system-logs', systemController.getSystemLogs);
  // System log detail
  app.post('/system-logs-detail', systemController.getSystemLogDetail);

  // ==================== User Profile ====================
  // Mine (user profile)
  app.get('/mine', systemController.getMine);
  // Mine logs
  app.get('/mine-logs', systemController.getMineLogs);

  // ==================== Other ====================
  // Card list
  app.post('/get-card-list', systemController.getCardList);
  // Map
  app.get('/get-map-info', systemController.getMapInfo);
}

export default systemRoutes;
