import { gameAccountController } from '../controllers/gameAccMgr.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

/**
 * Game Account Management routes (game_account table)
 */
export async function gameAccMgrRoutes(app) {
  app.addHook('preHandler', authenticate);

  // Get game accounts list
  app.post('/game-account-mgr', gameAccountController.getAccounts);
  // Get game account by ID
  app.get('/game-account-mgr/:id', gameAccountController.getAccountById);
  // Create game account
  app.post('/game-account-mgr/create', gameAccountController.createAccount);
  // Update game account
  app.put('/game-account-mgr/:id', gameAccountController.updateAccount);
  // Delete game account
  app.delete('/game-account-mgr/:id', gameAccountController.deleteAccount);
  // Batch delete game accounts
  app.post('/game-account-mgr/batch-delete', gameAccountController.batchDeleteAccounts);
}

export default gameAccMgrRoutes;
