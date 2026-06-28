import { gameCategoryWebController } from '../web_controllers/gameCategory.webController.js';
import { gameTagWebController } from '../web_controllers/gameTag.webController.js';
import { gameWebController } from '../web_controllers/game.webController.js';
import { authWebController } from '../web_controllers/auth.webController.js';
import { rentWebController } from '../web_controllers/rent.webController.js';
import { memberCdkWebController } from '../web_controllers/memberCdk.webController.js';

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

  // ==================== Rent ====================
  app.get('/web/rent/games', rentWebController.getRentGames);
  app.get('/web/rent/games/:id/accounts', rentWebController.getGameAccounts);
  app.post('/web/rent/redeem', rentWebController.redeemCdk);
  app.post('/web/rent/my-rentals', rentWebController.getMyRentals);

  // ==================== Account List (Navigation Page) ====================
  app.post('/web/accounts/list', rentWebController.getAccountList);

  // ==================== CDK (no auth required) ====================
  app.get('/web/cdk/config', rentWebController.cdkConfig);
  app.post('/web/cdk/exchange', rentWebController.cdkExchange);
  app.post('/web/cdk/rent', rentWebController.cdkRenew);
  app.post('/web/cdk/refresh', rentWebController.cdkRefresh);

  // ==================== Membership CDK ====================
  app.post('/web/membership/redeem-cdk', memberCdkWebController.redeemCdk);
  app.post('/web/membership/my-info', memberCdkWebController.getMyInfo);
}

export default webRoutes;
