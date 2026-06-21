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

// ==================== Rent Game Management ====================

/** 获取游戏列表 */
export const getRentGameList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/rent/games", { data });
};

/** 获取所有启用游戏（用于下拉选择） */
export const getAllRentGames = () => {
  return http.request<Result>("get", "/api/rent/games/all");
};

/** 获取游戏详情 */
export const getRentGameById = (id: number) => {
  return http.request<Result>("get", `/api/rent/games/${id}`);
};

/** 创建游戏 */
export const createRentGame = (data?: object) => {
  return http.request<Result>("post", "/api/rent/games/create", { data });
};

/** 更新游戏 */
export const updateRentGame = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/rent/games/${id}`, { data });
};

/** 删除游戏 */
export const deleteRentGame = (id: number) => {
  return http.request<Result>("delete", `/api/rent/games/${id}`);
};

// ==================== Rent Account Management ====================

/** 获取租号账号列表 */
export const getRentAccountList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/rent/accounts", { data });
};

/** 获取租号账号详情 */
export const getRentAccountById = (id: number) => {
  return http.request<Result>("get", `/api/rent/accounts/${id}`);
};

/** 创建租号账号 */
export const createRentAccount = (data?: object) => {
  return http.request<Result>("post", "/api/rent/accounts/create", { data });
};

/** 更新租号账号 */
export const updateRentAccount = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/rent/accounts/${id}`, { data });
};

/** 删除租号账号 */
export const deleteRentAccount = (id: number) => {
  return http.request<Result>("delete", `/api/rent/accounts/${id}`);
};

/** 批量删除租号账号 */
export const batchDeleteRentAccounts = (ids: number[]) => {
  return http.request<Result>("post", "/api/rent/accounts/batch-delete", {
    data: { ids }
  });
};

/** 导入SDA账号（JSON数据） */
export const importRentAccounts = (game_id: number, items: Array<any>) => {
  return http.request<Result>("post", "/api/rent/accounts/import", {
    data: { game_id, items }
  });
};

// ==================== Rent CDK Management ====================

/** 获取CDK列表 */
export const getRentCdkList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/rent/cdks", { data });
};

/** 获取CDK详情 */
export const getRentCdkById = (id: number) => {
  return http.request<Result>("get", `/api/rent/cdks/${id}`);
};

/** 创建CDK */
export const createRentCdk = (data?: object) => {
  return http.request<Result>("post", "/api/rent/cdks/create", { data });
};

/** 更新CDK */
export const updateRentCdk = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/rent/cdks/${id}`, { data });
};

/** 删除CDK */
export const deleteRentCdk = (id: number) => {
  return http.request<Result>("delete", `/api/rent/cdks/${id}`);
};

/** 批量删除CDK */
export const batchDeleteRentCdks = (ids: number[]) => {
  return http.request<Result>("post", "/api/rent/cdks/batch-delete", {
    data: { ids }
  });
};

/** 根据CDK组ID获取CDK列表 */
export const getRentCdksByGroup = (groupId: number, data?: object) => {
  return http.request<ResultTable>("post", `/api/rent/cdks/group/${groupId}`, { data });
};

// ==================== Rent CDK Group Management ====================

/** 获取CDK组列表 */
export const getRentCdkGroupList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/rent/cdk-groups", { data });
};

/** 获取CDK组详情 */
export const getRentCdkGroupById = (id: number) => {
  return http.request<Result>("get", `/api/rent/cdk-groups/${id}`);
};

/** 创建CDK组（批量生成CDK） */
export const createRentCdkGroup = (data: {
  game_id: number;
  count: number;
  rent_hours?: number;
  remark?: string;
}) => {
  return http.request<Result>("post", "/api/rent/cdk-groups/create", { data });
};

/** 更新CDK组 */
export const updateRentCdkGroup = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/rent/cdk-groups/${id}`, { data });
};

/** 删除CDK组 */
export const deleteRentCdkGroup = (id: number) => {
  return http.request<Result>("delete", `/api/rent/cdk-groups/${id}`);
};

// ==================== Rent Log Management ====================

/** 获取CDK使用记录列表 */
export const getRentLogList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/rent/logs", { data });
};

/** 删除CDK使用记录 */
export const deleteRentLog = (id: number) => {
  return http.request<Result>("delete", `/api/rent/logs/${id}`);
};
