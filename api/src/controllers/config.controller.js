import { carouselService, qaService, announcementService } from '../services/config.service.js';

// ==================== Config Carousel Controller ====================
export const carouselController = {
  getCarousels: async (request, reply) => {
    const body = request.body || {};
    const result = await carouselService.getCarousels(
      { title: body.title, status: body.status, type: body.type },
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

// ==================== Config QA Controller ====================
export const qaController = {
  getQas: async (request, reply) => {
    const body = request.body || {};
    const result = await qaService.getQas(
      { question: body.question, status: body.status, type: body.type },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getQaById: async (request, reply) => {
    const qa = await qaService.getQaById(request.params.id);
    if (!qa) return { code: 10001, message: 'QA 不存在', data: null };
    return { code: 0, message: '操作成功', data: qa };
  },

  createQa: async (request, reply) => {
    const data = request.body || {};
    if (!data.question) return { code: 10001, message: '请输入问题', data: null };
    const qa = await qaService.createQa(data);
    return { code: 0, message: '操作成功', data: qa };
  },

  updateQa: async (request, reply) => {
    const qa = await qaService.updateQa(request.params.id, request.body);
    return { code: 0, message: '操作成功', data: qa };
  },

  deleteQa: async (request, reply) => {
    await qaService.deleteQa(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  }
};

// ==================== Config Announcement Controller ====================
export const announcementController = {
  getAnnouncements: async (request, reply) => {
    const body = request.body || {};
    const result = await announcementService.getAnnouncements(
      { title: body.title, status: body.status, type: body.type },
      body.page || 1,
      body.limit || 10
    );
    return { code: 0, message: '操作成功', data: result };
  },

  getAnnouncementById: async (request, reply) => {
    const item = await announcementService.getAnnouncementById(request.params.id);
    if (!item) return { code: 10001, message: '公告不存在', data: null };
    return { code: 0, message: '操作成功', data: item };
  },

  createAnnouncement: async (request, reply) => {
    const data = request.body || {};
    if (!data.title) return { code: 10001, message: '请输入公告标题', data: null };
    const item = await announcementService.createAnnouncement(data);
    return { code: 0, message: '操作成功', data: item };
  },

  updateAnnouncement: async (request, reply) => {
    const item = await announcementService.updateAnnouncement(request.params.id, request.body);
    return { code: 0, message: '操作成功', data: item };
  },

  deleteAnnouncement: async (request, reply) => {
    await announcementService.deleteAnnouncement(request.params.id);
    return { code: 0, message: '操作成功', data: null };
  }
};
