import {
  offlineGameController,
  offlineVersionController,
  offlineAccountController,
  offlineCdkController,
  offlineCdkGroupController,
  offlineLogController
} from '../controllers/offline.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

export async function offlineRoutes(app) {
  app.addHook('preHandler', authenticate);

  // ==================== Offline Games ====================
  app.post('/offline/games', offlineGameController.getGames);
  app.get('/offline/games/all', offlineGameController.getAllGames);
  app.get('/offline/games/:id', offlineGameController.getGameById);
  app.post('/offline/games/create', offlineGameController.createGame);
  app.put('/offline/games/:id', offlineGameController.updateGame);
  app.delete('/offline/games/:id', offlineGameController.deleteGame);

  // ==================== Offline Versions ====================
  app.post('/offline/versions', offlineVersionController.getVersions);
  app.get('/offline/versions/all', offlineVersionController.getAllVersions);
  app.get('/offline/versions/:id', offlineVersionController.getVersionById);
  app.post('/offline/versions/create', offlineVersionController.createVersion);
  app.put('/offline/versions/:id', offlineVersionController.updateVersion);
  app.delete('/offline/versions/:id', offlineVersionController.deleteVersion);

  // ==================== Offline Accounts ====================
  app.post('/offline/accounts', offlineAccountController.getAccounts);
  app.get('/offline/accounts/:id', offlineAccountController.getAccountById);
  app.post('/offline/accounts/create', offlineAccountController.createAccount);
  app.put('/offline/accounts/:id', offlineAccountController.updateAccount);
  app.delete('/offline/accounts/:id', offlineAccountController.deleteAccount);
  app.post('/offline/accounts/batch-delete', offlineAccountController.batchDeleteAccounts);
  app.post('/offline/accounts/import', offlineAccountController.importAccounts);

  // ==================== Offline CDK ====================
  app.post('/offline/cdks', offlineCdkController.getCdks);
  app.get('/offline/cdks/:id', offlineCdkController.getCdkById);
  app.post('/offline/cdks/create', offlineCdkController.createCdk);
  app.put('/offline/cdks/:id', offlineCdkController.updateCdk);
  app.delete('/offline/cdks/:id', offlineCdkController.deleteCdk);
  app.post('/offline/cdks/batch-delete', offlineCdkController.batchDeleteCdks);
  app.post('/offline/cdks/redeem', offlineCdkController.redeemCdk);
  app.post('/offline/cdks/group/:group_id', offlineCdkController.getCdksByGroup);

  // ==================== Offline CDK Groups ====================
  app.post('/offline/cdk-groups', offlineCdkGroupController.getGroups);
  app.get('/offline/cdk-groups/:id', offlineCdkGroupController.getGroupById);
  app.post('/offline/cdk-groups/create', offlineCdkGroupController.createGroup);
  app.put('/offline/cdk-groups/:id', offlineCdkGroupController.updateGroup);
  app.delete('/offline/cdk-groups/:id', offlineCdkGroupController.deleteGroup);

  // ==================== Offline Log ====================
  app.post('/offline/logs', offlineLogController.getLogs);
  app.delete('/offline/logs/:id', offlineLogController.deleteLog);
}

export default offlineRoutes;
