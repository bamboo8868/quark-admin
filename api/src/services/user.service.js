import { UserModel } from '../models/user.model.js';
import { BaseService } from './base.service.js';

/**
 * User service
 */
export class UserService extends BaseService {
  constructor() {
    super(new UserModel());
    this.userModel = this.model;
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    return await this.userModel.findByEmail(email);
  }

  /**
   * Search users
   */
  async search(query, options = {}) {
    return await this.userModel.search(query, options);
  }

  /**
   * Get active users
   */
  async getActiveUsers(options = {}) {
    return await this.userModel.findActive(options);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, data) {
    const { name, avatar, phone } = data;
    
    return await this.update(userId, {
      name,
      avatar,
      phone
    });
  }

  /**
   * Deactivate user account
   */
  async deactivate(userId) {
    return await this.userModel.update(userId, {
      is_active: false
    });
  }

  /**
   * Activate user account
   */
  async activate(userId) {
    return await this.userModel.update(userId, {
      is_active: true
    });
  }

  /**
   * Update user role
   */
  async updateRole(userId, role) {
    return await this.userModel.update(userId, { role });
  }
}

export default UserService;
