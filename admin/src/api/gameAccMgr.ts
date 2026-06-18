import { http } from "@/utils/http";

type Result = {
  code: number;
  message: string;
  data?: any;
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
export const getGameAccMgrList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/game-account-mgr", { data });
};

/** 获取游戏账号详情 */
export const getGameAccMgrById = (id: number) => {
  return http.request<Result>("get", `/api/game-account-mgr/${id}`);
};

/** 创建游戏账号 */
export const createGameAccMgr = (data?: object) => {
  return http.request<Result>("post", "/api/game-account-mgr/create", { data });
};

/** 更新游戏账号 */
export const updateGameAccMgr = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/game-account-mgr/${id}`, { data });
};

/** 删除游戏账号 */
export const deleteGameAccMgr = (id: number) => {
  return http.request<Result>("delete", `/api/game-account-mgr/${id}`);
};

/** 批量删除游戏账号 */
export const batchDeleteGameAccMgr = (ids: number[]) => {
  return http.request<Result>("post", "/api/game-account-mgr/batch-delete", {
    data: { ids }
  });
};
