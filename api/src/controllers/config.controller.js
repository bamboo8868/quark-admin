import { carouselService } from '../services/config.service.js';

// ==================== Config Carousel Controller ====================
export const carouselController = {
  getCarousels: async (request, reply) => {
    const body = request.body || {};
    const result = await carouselService.getCarousels(
      { title: body.title, status: body.status },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getCarouselById: async (request, reply) => {
    const carousel = await carouselService.getCarouselById(request.params.id);
    if (!carousel) return { code: 10001, message: '轮播图不存在', data: null };
    return { code: 0, message: '操作成功', data: carousel };
  },

  createCarousel: async (request, reply) => {
    const data = request.body || {};
    if (!data.image) return { code: 10001, message: '请上传轮播图片', data: null };
    const carousel = await carouselService.createCarousel(data);
    return { code: 0, message: '操作成功', data: carousel };
  },

  updateCarousel: async (request, reply) => {
    const carousel = await carouselService.updateCarousel(request.params.id, request.body);
    return { code: 0, message: '操作成功', data: carousel };
  },

  deleteCarousel: async (request, reply) => {
    await carouselService.deleteCarousel(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  }
};
