import { memberController } from '../controllers/member.controller.js';
import { memberCdkController, memberCdkGroupController, memberCdkLogController } from '../controllers/memberCdk.controller.js';
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

  // ==================== Member CDK ====================
  // Get CDK list
  app.post('/members-cdk', memberCdkController.getCdks);
  // Get CDK by ID
  app.get('/members-cdk/:id', memberCdkController.getCdkById);
  // Create single CDK
  app.post('/members-cdk/create', memberCdkController.createCdk);
  // Batch generate CDKs
  app.post('/members-cdk/batch-create', memberCdkController.batchCreateCdks);
  // Update CDK
  app.put('/members-cdk/:id', memberCdkController.updateCdk);
  // Delete CDK
  app.delete('/members-cdk/:id', memberCdkController.deleteCdk);
  // Batch delete CDKs
  app.post('/members-cdk/batch-delete', memberCdkController.batchDeleteCdks);

  // ==================== Member CDK Group ====================
  // Get CDK group list
  app.post('/members-cdk-groups', memberCdkGroupController.getGroups);
  // Get CDK group by ID
  app.get('/members-cdk-groups/:id', memberCdkGroupController.getGroupById);
  // Create CDK group
  app.post('/members-cdk-groups/create', memberCdkGroupController.createGroup);
  // Update CDK group
  app.put('/members-cdk-groups/:id', memberCdkGroupController.updateGroup);
  // Delete CDK group
  app.delete('/members-cdk-groups/:id', memberCdkGroupController.deleteGroup);

  // ==================== Member CDK Log ====================
  // Get CDK log list
  app.post('/members-cdk-logs', memberCdkLogController.getLogs);
  // Delete CDK log
  app.delete('/members-cdk-logs/:id', memberCdkLogController.deleteLog);
}

export default memberRoutes;
