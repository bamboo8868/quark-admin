import { carouselService, qaService, announcementService, settingService } from '../services/config.service.js';

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

// ==================== Config Setting Controller (单值配置) ====================
export const settingController = {
  // GET /config/purchase-link
  getPurchaseLink: async (request, reply) => {
    const link = await settingService.getPurchaseLink();
    return { code: 0, message: '操作成功', data: { purchase_link: link } };
  },

  // PUT /config/purchase-link  Body: { purchase_link }
  updatePurchaseLink: async (request, reply) => {
    const data = request.body || {};
    const link = await settingService.setPurchaseLink(data.purchase_link || '');
    return { code: 0, message: '操作成功', data: { purchase_link: link } };
  },

  // GET /config/member-setting — 会员中心配置（每日可看游戏款数 + 客服链接）
  getMemberSetting: async (request, reply) => {
    const [daily_game_limit, customer_service_link] = await Promise.all([
      settingService.getMemberDailyGameLimit(),
      settingService.getCustomerServiceLink()
    ]);
    return { code: 0, message: '操作成功', data: { daily_game_limit, customer_service_link } };
  },

  // PUT /config/member-setting  Body: { daily_game_limit, customer_service_link }
  updateMemberSetting: async (request, reply) => {
    const data = request.body || {};
    const daily_game_limit = await settingService.setMemberDailyGameLimit(data.daily_game_limit);
    const customer_service_link = await settingService.setCustomerServiceLink(
      data.customer_service_link === undefined ? '' : String(data.customer_service_link).trim()
    );
    return { code: 0, message: '操作成功', data: { daily_game_limit, customer_service_link } };
  }
};
