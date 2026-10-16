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

// ==================== Config Carousel Management ====================

/** 获取轮播图列表 */
export const getCarouselList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/config/carousels", { data });
};

/** 获取轮播图详情 */
export const getCarouselById = (id: number) => {
  return http.request<Result>("get", `/api/config/carousels/${id}`);
};

/** 创建轮播图 */
export const createCarousel = (data?: object) => {
  return http.request<Result>("post", "/api/config/carousels/create", { data });
};

/** 更新轮播图 */
export const updateCarousel = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/config/carousels/${id}`, { data });
};

/** 删除轮播图 */
export const deleteCarousel = (id: number) => {
  return http.request<Result>("delete", `/api/config/carousels/${id}`);
};

// ==================== Config QA Management ====================

/** 获取 QA 列表 */
export const getQaList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/config/qas", { data });
};

/** 获取 QA 详情 */
export const getQaById = (id: number) => {
  return http.request<Result>("get", `/api/config/qas/${id}`);
};

/** 创建 QA */
export const createQa = (data?: object) => {
  return http.request<Result>("post", "/api/config/qas/create", { data });
};

/** 更新 QA */
export const updateQa = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/config/qas/${id}`, { data });
};

/** 删除 QA */
export const deleteQa = (id: number) => {
  return http.request<Result>("delete", `/api/config/qas/${id}`);
};

// ==================== Config Announcement Management ====================

/** 获取公告列表 */
export const getAnnouncementList = (data?: object) => {
  return http.request<ResultTable>("post", "/api/config/announcements", { data });
};

/** 获取公告详情 */
export const getAnnouncementById = (id: number) => {
  return http.request<Result>("get", `/api/config/announcements/${id}`);
};

/** 创建公告 */
export const createAnnouncement = (data?: object) => {
  return http.request<Result>("post", "/api/config/announcements/create", { data });
};

/** 更新公告 */
export const updateAnnouncement = (id: number, data?: object) => {
  return http.request<Result>("put", `/api/config/announcements/${id}`, { data });
};

/** 删除公告 */
export const deleteAnnouncement = (id: number) => {
  return http.request<Result>("delete", `/api/config/announcements/${id}`);
};
