import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import db from '../utils/db.js';
import logger from '../utils/logger.js';
const SALT_ROUNDS = 10;

/**
 * Auth Web Controller - public login / register for web project
 */
export const authWebController = {
  /**
   * Verify account exists (for forgot-password step 1)
   * POST /web/auth/verify-account
   * Body: { username, email }
   */
  verifyAccount: async (request, reply) => {
    const { username, email } = request.body || {};

    if (!username || !username.trim()) {
      return { code: 10001, message: '用户名不能为空', data: null };
    }
    if (!email || !email.trim()) {
      return { code: 10001, message: '邮箱不能为空', data: null };
    }

    const member = await db('members')
      .where('username', username.trim())
      .where('email', email.trim())
      .first();

    if (!member) {
      return { code: 10001, message: '用户名或邮箱不匹配', data: null };
    }
    if (member.status === 0) {
      return { code: 10002, message: '账号已被禁用', data: null };
    }

    return {
      code: 0,
      message: '验证成功',
      data: { username: member.username, email: member.email }
    };
  },

  /**
   * Reset password (for forgot-password step 2)
   * POST /web/auth/reset-password
   * Body: { username, email, newPassword }
   */
  resetPassword: async (request, reply) => {
    const { username, email, newPassword } = request.body || {};

    if (!username || !username.trim()) {
      return { code: 10001, message: '用户名不能为空', data: null };
    }
    if (!email || !email.trim()) {
      return { code: 10001, message: '邮箱不能为空', data: null };
    }
    if (!newPassword || newPassword.length < 6) {
      return { code: 10001, message: '新密码不能少于6位', data: null };
    }

    const member = await db('members')
      .where('username', username.trim())
      .where('email', email.trim())
      .first();

    if (!member) {
      return { code: 10001, message: '用户名或邮箱不匹配', data: null };
    }
    if (member.status === 0) {
      return { code: 10002, message: '账号已被禁用', data: null };
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db('members')
      .where('id', member.id)
      .update({ password: hashedPassword, updated_at: new Date() });

    logger.info(`Password reset for user ${username}`);

    return {
      code: 0,
      message: '密码重置成功',
      data: null
    };
  },

  /**
   * Register a new member
   * POST /web/auth/register
   * Body: { username, email, password }
   */
  register: async (request, reply) => {
    const { username, email, password } = request.body || {};

    // --- Validation ---
    if (!username || !username.trim()) {
      return { code: 10001, message: '用户名不能为空', data: null };
    }
    if (username.trim().length < 3 || username.trim().length > 30) {
      return { code: 10001, message: '用户名长度需在3-30个字符之间', data: null };
    }
    if (!email || !email.trim()) {
      return { code: 10001, message: '邮箱不能为空', data: null };
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { code: 10001, message: '邮箱格式不正确', data: null };
    }
    if (!password || password.length < 6) {
      return { code: 10001, message: '密码不能少于6位', data: null };
    }

    // --- Duplicate check ---
    const existingUser = await db('members').where('username', username.trim()).first();
    if (existingUser) {
      return { code: 10002, message: '用户名已存在', data: null };
    }

    const existingEmail = await db('members').where('email', email.trim()).first();
    if (existingEmail) {
      return { code: 10002, message: '邮箱已被注册', data: null };
    }

    // --- Create member ---
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [id] = await db('members').insert({
      username: username.trim(),
      email: email.trim(),
      password: hashedPassword,
      nickname: username.trim(),
      status: 1,
      member_level: 0,
      login_count: 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    return {
      code: 0,
      message: '注册成功',
      data: { id, username: username.trim(), email: email.trim() }
    };
  },

  /**
   * Login
   * POST /web/auth/login
   * Body: { username, password }
   */
  login: async (request, reply) => {
    const { username, password } = request.body || {};

    if (!username || !username.trim()) {
      return { code: 10001, message: '用户名不能为空', data: null };
    }
    if (!password) {
      return { code: 10001, message: '密码不能为空', data: null };
    }

    // --- Find member ---
    const member = await db('members').where('username', username.trim()).first();
    if (!member) {
      return { code: 10001, message: '用户名或密码错误', data: null };
    }

    // --- Status check ---
    if (member.status === 0) {
      return { code: 10002, message: '账号已被禁用', data: null };
    }

    // --- Password verification ---
    const isValid = await bcrypt.compare(password, member.password);
    if (!isValid) {
      return { code: 10001, message: '用户名或密码错误', data: null };
    }

    // --- Generate tokens ---
    const accessToken = jwt.sign(
      {
        memberId: member.id,
        username: member.username,
        type: 'web'
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    const refreshToken = jwt.sign(
      {
        memberId: member.id,
        type: 'web_refresh'
      },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );
    logger.info(`User ${username} logged in successfully`);
    // --- Update login info ---
    await db('members')
      .where('id', member.id)
      .update({
        last_login_at: new Date(),
        last_login_ip: request.ip || '',
        login_count: member.login_count + 1,
        updated_at: new Date()
      });

    return {
      code: 0,
      message: '登录成功',
      data: {
        id: member.id,
        username: member.username,
        nickname: member.nickname,
        avatar: member.avatar,
        email: member.email,
        member_level: member.member_level,
        accessToken,
        refreshToken,
        expires: new Date(Date.now() + 7 * 86400000).toISOString()
      }
    };
  }
};

export default authWebController;
