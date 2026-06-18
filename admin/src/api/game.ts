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

// ==================== Game Management ====================

/** 获取游戏列表 */
export const getGameList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/games", { data });
};

/** 获取游戏详情 */
export const getGameById = (id: number) => {
  return http.request<Result>("get", `/api/games/${id}`);
};

/** 创建游戏 */
export const createGame = (data?: object) => {
  return http.request<Result>("post", "/api/games/create", { data });
};

/** 更新游戏 */
export const updateGame = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/games/${id}`, { data });
};

/** 删除游戏 */
export const deleteGame = (id: number) => {
  return http.request<Result>("delete", `/api/games/${id}`);
};

/** 批量删除游戏 */
export const batchDeleteGames = (ids: number[]) => {
  return http.request<Result>("post", "/api/games/batch-delete", {
    data: { ids }
  });
};
