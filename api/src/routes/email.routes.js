import { emailController } from '../controllers/email.controller.js';
import { checkPermission } from '../middlewares/permission.middleware.js';

/**
 * Email routes
 */
export async function emailRoutes(app) {
  // ==================== Email Accounts ====================
  app.get('/email/accounts', { preHandler: [checkPermission('email:mail:query')] }, emailController.getEmailAccounts);
  app.get('/email/accounts/:id', { preHandler: [checkPermission('email:mail:query')] }, emailController.getEmailAccount);
  app.post('/email/accounts', { preHandler: [checkPermission('email:account:add')] }, emailController.createEmailAccount);
  app.put('/email/accounts/:id', { preHandler: [checkPermission('email:account:edit')] }, emailController.updateEmailAccount);
  app.delete('/email/accounts/:id', { preHandler: [checkPermission('email:account:delete')] }, emailController.deleteEmailAccount);

  // ==================== Email List ====================
  app.post('/email/list', { preHandler: [checkPermission('email:mail:query')] }, emailController.getEmails);

  // ==================== Email Detail ====================
  app.get('/email/detail/:id', { preHandler: [checkPermission('email:mail:query')] }, emailController.getEmailDetail);
}

export default emailRoutes;
