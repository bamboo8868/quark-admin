import { gameCategoryController } from '../controllers/gameCategory.controller.js';

/**
 * Game Category routes
 */
export async function gameCategoryRoutes(app) {
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
