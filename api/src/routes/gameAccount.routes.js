import { accountsSimpleController } from '../controllers/accountsSimple.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
/**
 * Game Account routes
 * CRUD APIs for accounts_simple table
 */
export async function gameAccountRoutes(app) {
  app.addHook('preHandler', authenticate);
  // ==================== Game Account Management ====================
  // Get accounts list
  app.post('/game-accounts', accountsSimpleController.getAccounts);
  // Get account by ID
  app.get('/game-accounts/:id', accountsSimpleController.getAccountById);
  // Create account
  app.post('/game-accounts/create', accountsSimpleController.createAccount);
  // Update account
  app.put('/game-accounts/:id', accountsSimpleController.updateAccount);
  // Delete account
  app.delete('/game-accounts/:id', accountsSimpleController.deleteAccount);
  // Batch delete accounts
  app.post('/game-accounts/batch-delete', accountsSimpleController.batchDeleteAccounts);
  // Import accounts from JSON
  app.post('/game-accounts/import', accountsSimpleController.importAccounts);

  app.post('/game-accounts/logout', accountsSimpleController.logout);
}

export default gameAccountRoutes;
