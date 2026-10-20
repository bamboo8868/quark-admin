import { steamFamilyController } from '../controllers/steamFamily.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

/**
 * Steam Family Group routes (admin only).
 */
export async function steamFamilyRoutes(app) {
  app.addHook('preHandler', authenticate);

  // Start a family-group creation job
  app.post('/steam/family/create', steamFamilyController.startCreate);
  // Poll job status + logs
  app.get('/steam/family/status/:jobId', steamFamilyController.getStatus);
}

export default steamFamilyRoutes;
