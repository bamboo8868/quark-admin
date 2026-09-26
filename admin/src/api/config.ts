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
