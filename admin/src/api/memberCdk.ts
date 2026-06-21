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

// ==================== Member CDK Management ====================

/** 获取CDK列表 */
export const getMemberCdkList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/members-cdk", { data });
};

/** 获取CDK详情 */
export const getMemberCdkById = (id: number) => {
  return http.request<Result>("get", `/api/members-cdk/${id}`);
};

/** 创建单个CDK */
export const createMemberCdk = (data?: object) => {
  return http.request<Result>("post", "/api/members-cdk/create", { data });
};

/** 批量生成CDK */
export const batchCreateMemberCdks = (data: {
  member_level: number;
  duration_months: number;
  count: number;
  remark?: string;
}) => {
  return http.request<Result>("post", "/api/members-cdk/batch-create", {
    data
  });
};

/** 更新CDK */
export const updateMemberCdk = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/members-cdk/${id}`, { data });
};

/** 删除CDK */
export const deleteMemberCdk = (id: number) => {
  return http.request<Result>("delete", `/api/members-cdk/${id}`);
};

/** 批量删除CDK */
export const batchDeleteMemberCdks = (ids: number[]) => {
  return http.request<Result>("post", "/api/members-cdk/batch-delete", {
    data: { ids }
  });
};
