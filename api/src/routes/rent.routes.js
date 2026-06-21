import { rentGameController, rentCdkController, rentCdkGroupController, rentLogController, rentGameAccountController } from '../controllers/rent.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function rentRoutes(app) {
  app.addHook('preHandler', authenticate);

  // ==================== Rent Games ====================
  app.post('/rent/games', rentGameController.getGames);
  app.get('/rent/games/all', rentGameController.getAllGames);
  app.get('/rent/games/:id', rentGameController.getGameById);
  app.post('/rent/games/create', rentGameController.createGame);
  app.put('/rent/games/:id', rentGameController.updateGame);
  app.delete('/rent/games/:id', rentGameController.deleteGame);

  // ==================== Rent Game Accounts ====================
  app.post('/rent/accounts', rentGameAccountController.getAccounts);
  app.get('/rent/accounts/:id', rentGameAccountController.getAccountById);
  app.post('/rent/accounts/create', rentGameAccountController.createAccount);
  app.put('/rent/accounts/:id', rentGameAccountController.updateAccount);
  app.delete('/rent/accounts/:id', rentGameAccountController.deleteAccount);
  app.post('/rent/accounts/batch-delete', rentGameAccountController.batchDeleteAccounts);
  app.post('/rent/accounts/import', rentGameAccountController.importExcel);

  // ==================== Rent CDK ====================
  app.post('/rent/cdks', rentCdkController.getCdks);
  app.get('/rent/cdks/:id', rentCdkController.getCdkById);
  app.post('/rent/cdks/create', rentCdkController.createCdk);
  app.put('/rent/cdks/:id', rentCdkController.updateCdk);
  app.delete('/rent/cdks/:id', rentCdkController.deleteCdk);
  app.post('/rent/cdks/batch-delete', rentCdkController.batchDeleteCdks);
  app.post('/rent/cdks/redeem', rentCdkController.redeemCdk);
  app.post('/rent/cdks/group/:group_id', rentCdkController.getCdksByGroup);

  // ==================== Rent CDK Groups ====================
  app.post('/rent/cdk-groups', rentCdkGroupController.getGroups);
  app.get('/rent/cdk-groups/:id', rentCdkGroupController.getGroupById);
  app.post('/rent/cdk-groups/create', rentCdkGroupController.createGroup);
  app.put('/rent/cdk-groups/:id', rentCdkGroupController.updateGroup);
  app.delete('/rent/cdk-groups/:id', rentCdkGroupController.deleteGroup);

  // ==================== Rent Log ====================
  app.post('/rent/logs', rentLogController.getLogs);
  app.delete('/rent/logs/:id', rentLogController.deleteLog);
}

export default rentRoutes;
