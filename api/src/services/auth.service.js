import { UserModel } from '../models/user.model.js';
import { generateTokenPair, verifyRefreshToken } from '../utils/jwt.js';
import { AuthenticationError, ConflictError, ValidationError } from '../middlewares/error.middleware.js';
import { getRedis } from '../config/redis.js';
import { log } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Authentication service
 */
export class AuthService {
  constructor() {
    this.userModel = new UserModel();
    this.redis = getRedis();
  }

  /**
   * Register new user
   */
  async register(data) {
    const { email, password, name } = data;

    // Validate input
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // Password strength validation
    this.validatePasswordStrength(password);

    // Check if user already exists
    const existingUser = await this.userModel.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user
    const user = await this.userModel.create({
      email: email.toLowerCase().trim(),
      password,
      name: name?.trim(),
      is_active: true,
      role: 'user'
    });

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    log.info('User registered', { userId: user.id, email: user.email });

    return {
      user: this.sanitizeUser(user),
      tokens
    };
  }

  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    if (!hasUpperCase) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
      errors.push('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      errors.push('Password must contain at least one special character');
    }

    if (errors.length > 0) {
      throw new ValidationError('Password does not meet security requirements', errors);
    }
  }

  /**
   * Login user with brute force protection
   */
  async login(email, password) {
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const attemptKey = `login_attempts:${normalizedEmail}`;
    
    // Check brute force attempts
    const attempts = await this.redis.get(attemptKey);
    if (attempts && parseInt(attempts) >= 5) {
      log.warn('Brute force login attempt detected', { email: normalizedEmail });
      throw new AuthenticationError('Too many failed attempts. Please try again later.');
    }

    // Find user
    const user = await this.userModel.findByEmail(normalizedEmail);
    if (!user) {
      await this.incrementLoginAttempts(attemptKey);
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await this.userModel.constructor.comparePassword(password, user.password);
    if (!isValidPassword) {
      await this.incrementLoginAttempts(attemptKey);
      log.warn('Failed login attempt', { email: normalizedEmail, userId: user.id });
      throw new AuthenticationError('Invalid credentials');
    }

    // Clear failed attempts on successful login
    await this.redis.del(attemptKey);

    // Update last login
    await this.userModel.updateLastLogin(user.id);

    // Generate tokens
    const tokens = generateTokenPair({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    log.info('User logged in', { userId: user.id, email: user.email });

    return {
      user: this.sanitizeUser(user),
      tokens
    };
  }

  /**
   * Increment login attempts
   */
  async incrementLoginAttempts(key) {
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      // Set expiration on first attempt (15 minutes)
      await this.redis.expire(key, 15 * 60);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    try {
      // Verify refresh token
      const decoded = verifyRefreshToken(refreshToken);
      
      // Check if token is blacklisted
      const isBlacklisted = await this.redis.get(`blacklist:refresh:${refreshToken}`);
      if (isBlacklisted) {
        throw new AuthenticationError('Token has been revoked');
      }

      // Find user
      const user = await this.userModel.findById(decoded.userId);
      if (!user || !user.is_active) {
        throw new AuthenticationError('User not found or deactivated');
      }

      // Generate new tokens
      const tokens = generateTokenPair({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      // Blacklist old refresh token
      await this.redis.setex(`blacklist:refresh:${refreshToken}`, 7 * 24 * 60 * 60, '1');

      return {
        user: this.sanitizeUser(user),
        tokens
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   */
  async logout(accessToken, refreshToken) {
    try {
      // Blacklist tokens
      if (accessToken) {
        await this.redis.setex(`blacklist:${accessToken}`, 24 * 60 * 60, '1');
      }
      if (refreshToken) {
        await this.redis.setex(`blacklist:refresh:${refreshToken}`, 7 * 24 * 60 * 60, '1');
      }
      
      return { message: 'Logged out successfully' };
    } catch (error) {
      throw new Error('Logout failed');
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId) {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return this.sanitizeUser(user);
  }

  /**
   * Change password with history check
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Verify current password
    const isValid = await this.userModel.constructor.comparePassword(currentPassword, user.password);
    if (!isValid) {
      throw new ValidationError('Current password is incorrect');
    }

    // Validate new password strength
    this.validatePasswordStrength(newPassword);

    // Check password history (prevent reusing recent passwords)
    const passwordHistoryKey = `password_history:${userId}`;
    const history = await this.redis.lrange(passwordHistoryKey, 0, 4);
    
    for (const oldHash of history) {
      const isReused = await this.userModel.constructor.comparePassword(newPassword, oldHash);
      if (isReused) {
        throw new ValidationError('Cannot reuse recent passwords');
      }
    }

    // Hash and store new password
    const bcrypt = await import('bcryptjs');
    const newHash = await bcrypt.hash(newPassword, 10);
    
    // Update password
    await this.userModel.update(userId, { password: newPassword });

    // Store in history
    await this.redis.lpush(passwordHistoryKey, newHash);
    await this.redis.ltrim(passwordHistoryKey, 0, 4); // Keep last 5 passwords
    await this.redis.expire(passwordHistoryKey, 90 * 24 * 60 * 60); // 90 days

    // Invalidate all existing tokens for this user
    await this.revokeAllUserTokens(userId);

    log.info('Password changed', { userId });

    return { message: 'Password changed successfully. Please login again.' };
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId) {
    const tokenKey = `user_tokens:${userId}`;
    const tokens = await this.redis.smembers(tokenKey);
    
    for (const token of tokens) {
      await this.redis.setex(`blacklist:${token}`, 24 * 60 * 60, '1');
    }
    
    await this.redis.del(tokenKey);
  }

  /**
   * Remove sensitive fields from user object
   */
  sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
  }
}

export default AuthService;
