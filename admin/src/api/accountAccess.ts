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

// ==================== D加密账号管理 ====================

/** 获取D加密账号列表 */
export const getAccountAccessList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/account-access", { data });
};

/** 获取D加密账号详情 */
export const getAccountAccessById = (id: number) => {
  return http.request<Result>("get", `/api/account-access/${id}`);
};

/** 创建D加密账号 */
export const createAccountAccess = (data?: object) => {
  return http.request<Result>("post", "/api/account-access/create", { data });
};

/** 更新D加密账号 */
export const updateAccountAccess = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/account-access/${id}`, { data });
};

/** 删除D加密账号 */
export const deleteAccountAccess = (id: number) => {
  return http.request<Result>("delete", `/api/account-access/${id}`);
};

export const backAccountAccess = (id: number) => {
  return http.request<Result>("post", `/api/account-access/back/${id}`);
};

/** 批量删除D加密账号 */
export const batchDeleteAccountAccess = (ids: number[]) => {
  return http.request<Result>("post", "/api/account-access/batch-delete", { data: { ids } });
};

/** 记录查看 */
export const recordView = (id: number) => {
  return http.request<Result>("post", `/api/account-access/${id}/view`);
};
