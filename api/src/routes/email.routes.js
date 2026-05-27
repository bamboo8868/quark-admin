import { emailController } from '../controllers/email.controller.js';
import { checkPermission } from '../middlewares/permission.middleware.js';

/**
 * Email routes
 */
export async function emailRoutes(app) {
  // ==================== Email Accounts ====================
  app.get('/email/accounts',  emailController.getEmailAccounts);
  app.get('/email/accounts/:id',  emailController.getEmailAccount);
  app.post('/email/accounts',  emailController.createEmailAccount);
  app.put('/email/accounts/:id',  emailController.updateEmailAccount);
  app.delete('/email/accounts/:id',  emailController.deleteEmailAccount);

  // ==================== Email List ====================
  app.post('/email/list',  emailController.getEmails);

  // ==================== Email Detail ====================
  app.get('/email/detail/:id',  emailController.getEmailDetail);
}

export default emailRoutes;
