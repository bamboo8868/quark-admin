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

// ==================== Member Management ====================

/** 获取会员列表 */
export const getMemberList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/members", { data });
};

/** 获取会员详情 */
export const getMemberById = (id: number) => {
  return http.request<Result>("get", `/api/members/${id}`);
};

/** 创建会员 */
export const createMember = (data?: object) => {
  return http.request<Result>("post", "/api/members/create", { data });
};

/** 更新会员 */
export const updateMember = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/members/${id}`, { data });
};

/** 删除会员 */
export const deleteMember = (id: number) => {
  return http.request<Result>("delete", `/api/members/${id}`);
};

/** 批量删除会员 */
export const batchDeleteMembers = (ids: number[]) => {
  return http.request<Result>("post", "/api/members/batch-delete", {
    data: { ids }
  });
};

/** 更新会员等级 */
export const updateMemberLevel = (id: number, data: { member_level: number }) => {
  return http.request<Result>("put", `/api/members/${id}/level`, { data });
};
