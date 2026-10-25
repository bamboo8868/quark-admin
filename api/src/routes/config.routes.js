import { carouselController, qaController, announcementController, settingController } from '../controllers/config.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function configRoutes(app) {
  app.addHook('preHandler', authenticate);

  // ==================== Config Carousel ====================
  app.post('/config/carousels', carouselController.getCarousels);
  app.get('/config/carousels/:id', carouselController.getCarouselById);
  app.post('/config/carousels/create', carouselController.createCarousel);
  app.put('/config/carousels/:id', carouselController.updateCarousel);
  app.delete('/config/carousels/:id', carouselController.deleteCarousel);

  // ==================== Config QA (常见问题) ====================
  app.post('/config/qas', qaController.getQas);
  app.get('/config/qas/:id', qaController.getQaById);
  app.post('/config/qas/create', qaController.createQa);
  app.put('/config/qas/:id', qaController.updateQa);
  app.delete('/config/qas/:id', qaController.deleteQa);

  // ==================== Config Announcement (公告) ====================
  app.post('/config/announcements', announcementController.getAnnouncements);
  app.get('/config/announcements/:id', announcementController.getAnnouncementById);
  app.post('/config/announcements/create', announcementController.createAnnouncement);
  app.put('/config/announcements/:id', announcementController.updateAnnouncement);
  app.delete('/config/announcements/:id', announcementController.deleteAnnouncement);

  // ==================== Config Setting (单值配置：购买链接) ====================
  app.get('/config/purchase-link', settingController.getPurchaseLink);
  app.put('/config/purchase-link', settingController.updatePurchaseLink);

  // ==================== Config Setting (会员中心配置) ====================
  app.get('/config/member-setting', settingController.getMemberSetting);
  app.put('/config/member-setting', settingController.updateMemberSetting);
}

export default configRoutes;
