import { http } from "@/utils/http";

type Result = {
  code: number;
  message: string;
  data?: Array<any>;
};

type ResultTable = {
  code: number;
  message: string;
  data?: {
    /** 列表数据 */
    list: Array<any>;
    /** 总条目数 */
    total?: number;
    /** 每页显示条目个数 */
    pageSize?: number;
    /** 当前页数 */
    currentPage?: number;
  };
};

/** 获取系统管理-用户管理列表 */
export const getUserList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/user", { data });
};

/** 系统管理-用户管理-获取所有角色列表 */
export const getAllRoleList = () => {
  return http.request<Result>("get", "/api/list-all-role");
};

/** 系统管理-用户管理-根据userId，获取对应角色id列表（userId：用户id） */
export const getRoleIds = (data?: object) => {
  return http.request<Result>("post", "/api/list-role-ids", { data });
};

/** 获取系统管理-角色管理列表 */
export const getRoleList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/role", { data });
};

/** 获取系统管理-菜单管理列表 */
export const getMenuList = (data?: object) => {
  return http.request<Result>("post", "/api/menu", { data });
};

/** 获取系统管理-部门管理列表 */
export const getDeptList = (data?: object) => {
  return http.request<Result>("post", "/api/dept", { data });
};

/** 获取系统监控-在线用户列表 */
export const getOnlineLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/online-logs", { data });
};

/** 获取系统监控-登录日志列表 */
export const getLoginLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/login-logs", { data });
};

/** 获取系统监控-操作日志列表 */
export const getOperationLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/operation-logs", { data });
};

/** 获取系统监控-系统日志列表 */
export const getSystemLogsList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/system-logs", { data });
};

/** 获取系统监控-系统日志-根据 id 查日志详情 */
export const getSystemLogsDetail = (data?: object) => {
  return http.request<Result>("post", "/api/system-logs-detail", { data });
};

/** 获取角色管理-权限-菜单权限 */
export const getRoleMenu = (data?: object) => {
  return http.request<Result>("post", "/api/role-menu", { data });
};

/** 获取角色管理-权限-菜单权限-根据角色 id 查对应菜单 */
export const getRoleMenuIds = (data?: object) => {
  return http.request<Result>("post", "/api/role-menu-ids", { data });
};

// ==================== Role Management ====================

/** 获取角色详情 */
export const getRoleById = (id: number) => {
  return http.request<Result>("get", `/api/role/${id}`);
};

/** 创建角色 */
export const createRole = (data?: object) => {
  return http.request<Result>("post", "/api/role/create", { data });
};

/** 更新角色 */
export const updateRole = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/role/${id}`, { data });
};

/** 删除角色 */
export const deleteRole = (id: number) => {
  return http.request<Result>("delete", `/api/role/${id}`);
};

/** 更新角色菜单权限 */
export const updateRoleMenu = (id: number, menuIds: number[]) => {
  return http.request<Result>("put", `/api/role/${id}/menus`, { data: { menuIds } });
};

// ==================== User Management ====================

/** 获取用户详情 */
export const getUserById = (id: number) => {
  return http.request<Result>("get", `/api/user/${id}`);
};

/** 创建用户 */
export const createUser = (data?: object) => {
  return http.request<Result>("post", "/api/user/create", { data });
};

/** 更新用户 */
export const updateUser = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/user/${id}`, { data });
};

/** 删除用户 */
export const deleteUser = (id: number) => {
  return http.request<Result>("delete", `/api/user/${id}`);
};

/** 批量删除用户 */
export const batchDeleteUsers = (ids: number[]) => {
  return http.request<Result>("post", "/api/user/batch-delete", { data: { ids } });
};

/** 重置用户密码 */
export const resetUserPassword = (id: number, password: string) => {
  return http.request<Result>("put", `/api/user/${id}/reset-password`, { data: { password } });
};

/** 更新用户角色 */
export const updateUserRole = (userId: number, roleIds: number[]) => {
  return http.request<Result>("put", `/api/user/${userId}/roles`, { data: { roleIds } });
};

// ==================== Menu Management ====================

/** 创建菜单 */
export const createMenu = (data?: object) => {
  return http.request<Result>("post", "/api/menu/create", { data });
};

/** 更新菜单 */
export const updateMenu = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/menu/${id}`, { data });
};

/** 删除菜单 */
export const deleteMenu = (id: number) => {
  return http.request<Result>("delete", `/api/menu/${id}`);
};

// ==================== Department Management ====================

/** 获取部门树结构 */
export const getDeptTree = () => {
  return http.request<Result>("get", "/api/dept/tree");
};

/** 获取部门详情 */
export const getDeptById = (id: number) => {
  return http.request<Result>("get", `/api/dept/${id}`);
};

/** 创建部门 */
export const createDept = (data?: object) => {
  return http.request<Result>("post", "/api/dept/create", { data });
};

/** 更新部门 */
export const updateDept = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/dept/${id}`, { data });
};

/** 删除部门 */
export const deleteDept = (id: number) => {
  return http.request<Result>("delete", `/api/dept/${id}`);
};

// ==================== System Monitor ====================

/** 强制用户下线 */
export const forceOffline = (id: number) => {
  return http.request<Result>("post", "/api/force-offline", { data: { id } });
};

/** 批量删除登录日志 */
export const batchDeleteLoginLogs = (ids: number[]) => {
  return http.request<Result>("post", "/api/login-logs/batch-delete", { data: { ids } });
};

/** 清空登录日志 */
export const clearLoginLogs = () => {
  return http.request<Result>("post", "/api/login-logs/clear");
};

/** 批量删除操作日志 */
export const batchDeleteOperationLogs = (ids: number[]) => {
  return http.request<Result>("post", "/api/operation-logs/batch-delete", { data: { ids } });
};

/** 清空操作日志 */
export const clearOperationLogs = () => {
  return http.request<Result>("post", "/api/operation-logs/clear");
};

/** 批量删除系统日志 */
export const batchDeleteSystemLogs = (ids: number[]) => {
  return http.request<Result>("post", "/api/system-logs/batch-delete", { data: { ids } });
};

/** 清空系统日志 */
export const clearSystemLogs = () => {
  return http.request<Result>("post", "/api/system-logs/clear");
};
