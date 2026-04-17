import { BaseController } from './base.controller.js';
import { AuthService } from '../services/auth.service.js';
import { HttpStatus } from '../utils/response.js';
import { log } from '../utils/logger.js';

/**
 * Authentication controller
 */
export class AuthController extends BaseController {
  constructor() {
    super();
    this.authService = new AuthService();
  }

  /**
   * Register new user
   */
  async register(request, reply) {
    this.logAction('register', { email: request.body.email });
    
    const result = await this.authService.register(request.body);
    
    return reply.status(HttpStatus.CREATED).send({
      success: true,
      data: result,
      message: 'User registered successfully'
    });
  }

  /**
   * Login user
   */
  async login(request, reply) {
    this.logAction('login', { email: request.body.email });
    
    const { email, password } = request.body;
    const result = await this.authService.login(email, password);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result,
      message: 'Login successful'
    });
  }

  /**
   * Refresh access token
   */
  async refresh(request, reply) {
    this.logAction('refresh');
    
    const { refreshToken } = request.body;
    const result = await this.authService.refreshToken(refreshToken);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result,
      message: 'Token refreshed successfully'
    });
  }

  /**
   * Logout user
   */
  async logout(request, reply) {
    this.logAction('logout', { userId: this.getUserId(request) });
    
    const authHeader = request.headers.authorization;
    const accessToken = authHeader ? authHeader.substring(7) : null;
    
    // Get refresh token from body if provided
    const { refreshToken } = request.body || {};
    
    const result = await this.authService.logout(accessToken, refreshToken);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result
    });
  }

  /**
   * Get current user
   */
  async getCurrentUser(request, reply) {
    const userId = this.getUserId(request);
    
    this.logAction('getCurrentUser', { userId });
    
    const user = await this.authService.getCurrentUser(userId);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: { user }
    });
  }

  /**
   * Change password
   */
  async changePassword(request, reply) {
    const userId = this.getUserId(request);
    const { currentPassword, newPassword } = request.body;
    
    this.logAction('changePassword', { userId });
    
    const result = await this.authService.changePassword(userId, currentPassword, newPassword);
    
    return reply.status(HttpStatus.OK).send({
      success: true,
      data: result
    });
  }
}

export default AuthController;
