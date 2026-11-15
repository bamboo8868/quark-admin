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

// ==================== Member Games Simple (会员简易游戏库) ====================

/** 获取简易游戏列表 */
export const getMemberGameSimpleList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/member-games-simple", { data });
};

/** 获取简易游戏详情 */
export const getMemberGameSimpleById = (id: number) => {
  return http.request<Result>("get", `/api/member-games-simple/${id}`);
};

/** 创建简易游戏 */
export const createMemberGameSimple = (data?: object) => {
  return http.request<Result>("post", "/api/member-games-simple/create", {
    data
  });
};

/** 导入SDA/maFile（仅绑定已存在账号的密钥，与游戏账号导入一致） */
export const importMemberGameSimpleSda = (items: Array<any>) => {
  return http.request<Result>("post", "/api/member-games-simple/import", {
    data: { items }
  });
};

/** 更新简易游戏 */
export const updateMemberGameSimple = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/member-games-simple/${id}`, { data });
};

/** 删除简易游戏 */
export const deleteMemberGameSimple = (id: number) => {
  return http.request<Result>("delete", `/api/member-games-simple/${id}`);
};
