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

// ==================== Offline Game Management ====================

/** 获取游戏列表 */
export const getOfflineGameList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/offline/games", { data });
};

/** 获取所有启用游戏（下拉选择） */
export const getAllOfflineGames = () => {
  return http.request<Result>("get", "/api/offline/games/all");
};

/** 获取游戏详情 */
export const getOfflineGameById = (id: number) => {
  return http.request<Result>("get", `/api/offline/games/${id}`);
};

/** 创建游戏 */
export const createOfflineGame = (data?: object) => {
  return http.request<Result>("post", "/api/offline/games/create", { data });
};

/** 更新游戏 */
export const updateOfflineGame = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/offline/games/${id}`, { data });
};

/** 删除游戏 */
export const deleteOfflineGame = (id: number) => {
  return http.request<Result>("delete", `/api/offline/games/${id}`);
};

// ==================== Offline Version Management ====================

/** 获取版本列表 */
export const getOfflineVersionList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/offline/versions", { data });
};

/** 获取所有启用版本（下拉选择） */
export const getAllOfflineVersions = (gameId?: number) => {
  return http.request<Result>("get", "/api/offline/versions/all", {
    params: { game_id: gameId }
  });
};

/** 获取版本详情 */
export const getOfflineVersionById = (id: number) => {
  return http.request<Result>("get", `/api/offline/versions/${id}`);
};

/** 创建版本 */
export const createOfflineVersion = (data?: object) => {
  return http.request<Result>("post", "/api/offline/versions/create", { data });
};

/** 更新版本 */
export const updateOfflineVersion = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/offline/versions/${id}`, { data });
};

/** 删除版本 */
export const deleteOfflineVersion = (id: number) => {
  return http.request<Result>("delete", `/api/offline/versions/${id}`);
};

// ==================== Offline Account Management ====================

/** 获取账号列表 */
export const getOfflineAccountList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/offline/accounts", { data });
};

/** 获取账号详情 */
export const getOfflineAccountById = (id: number) => {
  return http.request<Result>("get", `/api/offline/accounts/${id}`);
};

/** 创建账号 */
export const createOfflineAccount = (data?: object) => {
  return http.request<Result>("post", "/api/offline/accounts/create", { data });
};

/** 更新账号 */
export const updateOfflineAccount = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/offline/accounts/${id}`, { data });
};

/** 删除账号 */
export const deleteOfflineAccount = (id: number) => {
  return http.request<Result>("delete", `/api/offline/accounts/${id}`);
};

/** 批量删除账号 */
export const batchDeleteOfflineAccounts = (ids: number[]) => {
  return http.request<Result>("post", "/api/offline/accounts/batch-delete", {
    data: { ids }
  });
};

/** 导入 SDA/maFile（按账号名跨游戏/版本绑定到已存在的离线账号，未匹配的跳过） */
export const importOfflineAccounts = (items: Array<any>) => {
  return http.request<Result>("post", "/api/offline/accounts/import", {
    data: { items }
  });
};

// ==================== Offline CDK Management ====================

/** 获取CDK列表 */
export const getOfflineCdkList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/offline/cdks", { data });
};

/** 获取CDK详情 */
export const getOfflineCdkById = (id: number) => {
  return http.request<Result>("get", `/api/offline/cdks/${id}`);
};

/** 创建CDK */
export const createOfflineCdk = (data?: object) => {
  return http.request<Result>("post", "/api/offline/cdks/create", { data });
};

/** 更新CDK */
export const updateOfflineCdk = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/offline/cdks/${id}`, { data });
};

/** 删除CDK */
export const deleteOfflineCdk = (id: number) => {
  return http.request<Result>("delete", `/api/offline/cdks/${id}`);
};

/** 批量删除CDK */
export const batchDeleteOfflineCdks = (ids: number[]) => {
  return http.request<Result>("post", "/api/offline/cdks/batch-delete", {
    data: { ids }
  });
};

/** 根据CDK组ID获取CDK列表 */
export const getOfflineCdksByGroup = (groupId: number, data?: object) => {
  return http.request<ResultTable>(
    "post",
    `/api/offline/cdks/group/${groupId}`,
    { data }
  );
};

// ==================== Offline CDK Group Management ====================

/** 获取CDK组列表 */
export const getOfflineCdkGroupList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/offline/cdk-groups", { data });
};

/** 获取CDK组详情 */
export const getOfflineCdkGroupById = (id: number) => {
  return http.request<Result>("get", `/api/offline/cdk-groups/${id}`);
};

/** 创建CDK组（批量生成CDK） */
export const createOfflineCdkGroup = (data: {
  game_id: number;
  version_id: number;
  count: number;
  remark?: string;
  expire_at?: string;
}) => {
  return http.request<Result>("post", "/api/offline/cdk-groups/create", {
    data
  });
};

/** 更新CDK组 */
export const updateOfflineCdkGroup = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/offline/cdk-groups/${id}`, { data });
};

/** 删除CDK组 */
export const deleteOfflineCdkGroup = (id: number) => {
  return http.request<Result>("delete", `/api/offline/cdk-groups/${id}`);
};

// ==================== Offline Log Management ====================

/** 获取使用记录列表 */
export const getOfflineLogList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/offline/logs", { data });
};

/** 删除使用记录 */
export const deleteOfflineLog = (id: number) => {
  return http.request<Result>("delete", `/api/offline/logs/${id}`);
};
