import { MemberModel } from '../models/member.model.js';
import db from '../utils/db.js';
import bcrypt from 'bcryptjs';

const memberModel = new MemberModel();

/**
 * Member Service
 */
export const memberService = {
  async getMembers(filters, page, limit) {
    return await memberModel.getMembersWithFilters(filters, page, limit);
  },

  async getMemberById(id) {
    const member = await memberModel.findById(id);
    if (member) {
      delete member.password;
    }
    return member;
  },

  async createMember(data) {
    // Check username uniqueness
    const existing = await memberModel.findByUsername(data.username);
    if (existing) {
      throw new Error('用户名已存在');
    }

    // Check email uniqueness if provided
    if (data.email) {
      const existingEmail = await memberModel.findByEmail(data.email);
      if (existingEmail) {
        throw new Error('邮箱已被注册');
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const insertData = {
      ...data,
      password: hashedPassword,
      nickname: data.nickname || data.username
    };

    return await memberModel.create(insertData);
  },

  async updateMember(id, data) {
    // Remove password from update if empty
    if (data.password === '' || data.password === undefined) {
      delete data.password;
    } else if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    // Check email uniqueness if changing
    if (data.email) {
      const existingEmail = await memberModel.findByEmail(data.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new Error('邮箱已被其他用户使用');
      }
    }

    return await memberModel.update(id, data);
  },

  async deleteMember(id) {
    return await memberModel.delete(id);
  },

  async batchDeleteMembers(ids) {
    return await db('members').whereIn('id', ids).delete();
  },

  async updateMemberLevel(id, memberLevel, memberExpireAt = null) {
    return await memberModel.update(id, {
      member_level: memberLevel,
      member_expire_at: memberExpireAt
    });
  }
};

export default memberService;
