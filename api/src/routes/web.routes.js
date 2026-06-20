import { gameCategoryWebController } from '../web_controllers/gameCategory.webController.js';
import { gameTagWebController } from '../web_controllers/gameTag.webController.js';
import { gameWebController } from '../web_controllers/game.webController.js';
import { authWebController } from '../web_controllers/auth.webController.js';

/**
 * Web routes - public APIs for web project (no admin auth required)
 */
export async function webRoutes(app) {
  // ==================== Auth ====================
  app.post('/web/auth/register',        authWebController.register);
  app.post('/web/auth/login',           authWebController.login);
  app.post('/web/auth/verify-account',  authWebController.verifyAccount);
  app.post('/web/auth/reset-password',  authWebController.resetPassword);

  // ==================== Game Categories ====================
  app.get('/web/game-categories', gameCategoryWebController.getCategories);
  app.get('/web/game-categories/:id', gameCategoryWebController.getCategoryById);

  // ==================== Game Tags ====================
  app.get('/web/game-tags', gameTagWebController.getTags);

  // ==================== Games ====================
  app.post('/web/games', gameWebController.getGames);
  app.get('/web/games/:id', gameWebController.getGameById);
}

export default webRoutes;
