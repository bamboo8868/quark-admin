import { gameTagController } from '../controllers/gameTag.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
/**
 * Game Tag routes
 */
export async function gameTagRoutes(app) {
  app.addHook('preHandler', authenticate);
  // Get tags list
  app.post('/game-tags', gameTagController.getTags);
  // Get tag by ID
  app.get('/game-tags/:id', gameTagController.getTagById);
  // Create tag
  app.post('/game-tags/create', gameTagController.createTag);
  // Update tag
  app.put('/game-tags/:id', gameTagController.updateTag);
  // Delete tag
  app.delete('/game-tags/:id', gameTagController.deleteTag);
}

export default gameTagRoutes;
