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

// ==================== Game Category Management ====================

/** 获取游戏分类列表 */
export const getGameCategoryList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/game-categories", { data });
};

/** 获取游戏分类详情 */
export const getGameCategoryById = (id: number) => {
  return http.request<Result>("get", `/api/game-categories/${id}`);
};

/** 创建游戏分类 */
export const createGameCategory = (data?: object) => {
  return http.request<Result>("post", "/api/game-categories/create", { data });
};

/** 更新游戏分类 */
export const updateGameCategory = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/game-categories/${id}`, { data });
};

/** 删除游戏分类 */
export const deleteGameCategory = (id: number) => {
  return http.request<Result>("delete", `/api/game-categories/${id}`);
};
