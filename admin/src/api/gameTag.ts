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

// ==================== Game Tag Management ====================

/** 获取游戏标签列表 */
export const getGameTagList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/game-tags", { data });
};

/** 获取游戏标签详情 */
export const getGameTagById = (id: number) => {
  return http.request<Result>("get", `/api/game-tags/${id}`);
};

/** 创建游戏标签 */
export const createGameTag = (data?: object) => {
  return http.request<Result>("post", "/api/game-tags/create", { data });
};

/** 更新游戏标签 */
export const updateGameTag = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/game-tags/${id}`, { data });
};

/** 删除游戏标签 */
export const deleteGameTag = (id: number) => {
  return http.request<Result>("delete", `/api/game-tags/${id}`);
};
