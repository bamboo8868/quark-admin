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
    list: Array<any>;
    total?: number;
    pageSize?: number;
    currentPage?: number;
  };
};

// ==================== Game Account Management ====================

/** 获取游戏账号列表 */
export const getGameAccountList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/game-accounts", { data });
};

/** 获取游戏账号详情 */
export const getGameAccountById = (id: number) => {
  return http.request<Result>("get", `/api/game-accounts/${id}`);
};

/** 创建游戏账号 */
export const createGameAccount = (data?: object) => {
  return http.request<Result>("post", "/api/game-accounts/create", { data });
};

/** 更新游戏账号 */
export const updateGameAccount = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/game-accounts/${id}`, { data });
};

/** 删除游戏账号 */
export const deleteGameAccount = (id: number) => {
  return http.request<Result>("delete", `/api/game-accounts/${id}`);
};

/** 批量删除游戏账号 */
export const batchDeleteGameAccounts = (ids: number[]) => {
  return http.request<Result>("post", "/api/game-accounts/batch-delete", { data: { ids } });
};

/** 导入游戏账号（JSON数据） */
export const importGameAccounts = (items: Array<any>) => {
  return http.request<Result>("post", "/api/game-accounts/import", { data: { items } });
};

/** 注销游戏账号 */
export const logoutGameAccount = (id: number) => {
  return http.request<Result>("post", "/api/game-accounts/logout", { data: { id } });
};
