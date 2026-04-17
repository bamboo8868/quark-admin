import { BaseController } from './base.controller.js';
import { UserService } from '../services/user.service.js';
import { HttpStatus } from '../utils/response.js';

/**
 * User controller
 */
export class UserController extends BaseController {
  constructor() {
    super();
    this.userService = new UserService();
  }

  /**
   * Get all users
   */
  async findAll(request, reply) {
    const options = this.getPaginationOptions(request.query);
    
    this.logAction('findAll', { options });
    
    const result = await this.userService.findAll(options);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result.data,
      meta: result.meta
    });
  }

  /**
   * Get user by ID
   */
  async findById(request, reply) {
    const { id } = request.params;
    
    this.logAction('findById', { id });
    
    const user = await this.userService.findById(id);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: { user }
    });
  }

  /**
   * Create new user
   */
  async create(request, reply) {
    this.logAction('create', { email: request.body.email });
    
    const user = await this.userService.create(request.body);
    
    return reply.status(HttpStatus.CREATED).send({
      success: true,
      data: { user },
      message: 'User created successfully'
    });
  }

  /**
   * Update user
   */
  async update(request, reply) {
    const { id } = request.params;
    
    this.logAction('update', { id });
    
    const user = await this.userService.update(id, request.body);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: { user },
      message: 'User updated successfully'
    });
  }

  /**
   * Delete user
   */
  async delete(request, reply) {
    const { id } = request.params;
    
    this.logAction('delete', { id });
    
    await this.userService.delete(id);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: null,
      message: 'User deleted successfully'
    });
  }

  /**
   * Search users
   */
  async search(request, reply) {
    const { q, page, limit } = request.query;
    const options = this.getPaginationOptions({ page, limit });
    
    this.logAction('search', { query: q });
    
    const result = await this.userService.search(q, options);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result.data,
      meta: result.meta
    });
  }

  /**
   * Get active users
   */
  async getActiveUsers(request, reply) {
    const options = this.getPaginationOptions(request.query);
    
    this.logAction('getActiveUsers');
    
    const result = await this.userService.getActiveUsers(options);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result.data,
      meta: result.meta
    });
  }

  /**
   * Update current user profile
   */
  async updateProfile(request, reply) {
    const userId = this.getUserId(request);
    
    this.logAction('updateProfile', { userId });
    
    const user = await this.userService.updateProfile(userId, request.body);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: { user },
      message: 'Profile updated successfully'
    });
  }

  /**
   * Deactivate user account
   */
  async deactivate(request, reply) {
    const { id } = request.params;
    
    this.logAction('deactivate', { id });
    
    await this.userService.deactivate(id);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: null,
      message: 'User deactivated successfully'
    });
  }

  /**
   * Activate user account
   */
  async activate(request, reply) {
    const { id } = request.params;
    
    this.logAction('activate', { id });
    
    await this.userService.activate(id);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: null,
      message: 'User activated successfully'
    });
  }
}

export default UserController;
