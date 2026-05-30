import { accountsSimpleController } from '../controllers/accountsSimple.controller.js';

/**
 * Game Account routes
 * CRUD APIs for accounts_simple table
 */
export async function gameAccountRoutes(app) {
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
}

export default gameAccountRoutes;
