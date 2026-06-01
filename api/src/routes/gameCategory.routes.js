import { gameCategoryController } from '../controllers/gameCategory.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
/**
 * Game Category routes
 */
export async function gameCategoryRoutes(app) {
  app.addHook('preHandler', authenticate);
  // Get categories list
  app.post('/game-categories', gameCategoryController.getCategories);
  // Get category by ID
  app.get('/game-categories/:id', gameCategoryController.getCategoryById);
  // Create category
  app.post('/game-categories/create', gameCategoryController.createCategory);
  // Update category
  app.put('/game-categories/:id', gameCategoryController.updateCategory);
  // Delete category
  app.delete('/game-categories/:id', gameCategoryController.deleteCategory);
}

export default gameCategoryRoutes;
