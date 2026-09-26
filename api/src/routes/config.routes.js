import { carouselController } from '../controllers/config.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function configRoutes(app) {
  app.addHook('preHandler', authenticate);

  // ==================== Config Carousel ====================
  app.post('/config/carousels', carouselController.getCarousels);
  app.get('/config/carousels/:id', carouselController.getCarouselById);
  app.post('/config/carousels/create', carouselController.createCarousel);
  app.put('/config/carousels/:id', carouselController.updateCarousel);
  app.delete('/config/carousels/:id', carouselController.deleteCarousel);
}

export default configRoutes;
