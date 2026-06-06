import { memberController } from '../controllers/member.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

/**
 * Member routes
 */
export async function memberRoutes(app) {
  app.addHook('preHandler', authenticate);

  // Get members list
  app.post('/members', memberController.getMembers);
  // Get member by ID
  app.get('/members/:id', memberController.getMemberById);
  // Create member
  app.post('/members/create', memberController.createMember);
  // Update member
  app.put('/members/:id', memberController.updateMember);
  // Delete member
  app.delete('/members/:id', memberController.deleteMember);
  // Batch delete members
  app.post('/members/batch-delete', memberController.batchDeleteMembers);
  // Update member level
  app.put('/members/:id/level', memberController.updateMemberLevel);
}

export default memberRoutes;
