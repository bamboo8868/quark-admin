import { accountAccessRecordsController } from '../controllers/accountAccessRecords.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
/**
 * Account Access Records routes
 * CRUD APIs for account_access_records table (D加密账号管理)
 */
export async function accountAccessRecordsRoutes(app) {
  app.addHook('preHandler', authenticate);
  // ==================== Account Access Records ====================
  // Get records list
  app.post('/account-access', accountAccessRecordsController.getRecords);
  // Get record by ID
  app.get('/account-access/:id', accountAccessRecordsController.getRecordById);
  // Create record
  app.post('/account-access/create', accountAccessRecordsController.createRecord);
  // Update record
  app.put('/account-access/:id', accountAccessRecordsController.updateRecord);
  // Delete record
  app.delete('/account-access/:id', accountAccessRecordsController.deleteRecord);
  // Back record
  app.post('/account-access/back/:id', accountAccessRecordsController.backRecord);
  // Batch delete records
  app.post('/account-access/batch-delete', accountAccessRecordsController.batchDeleteRecords);
  // Record a view
  app.post('/account-access/:id/view', accountAccessRecordsController.recordView);
}

export default accountAccessRecordsRoutes;
