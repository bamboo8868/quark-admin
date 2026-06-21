import { MemberCdkModel } from '../models/memberCdk.model.js';
import { MemberModel } from '../models/member.model.js';
import { getDatabase } from '../config/database.js';
import crypto from 'crypto';

const memberCdkModel = new MemberCdkModel();
const memberModel = new MemberModel();

/**
 * Generate a random CDK code (format: XXXX-XXXX-XXXX-XXXX)
 */
function generateCdkCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1 to avoid confusion
  const segments = 4;
  const segLen = 4;
  const parts = [];
  for (let s = 0; s < segments; s++) {
    let part = '';
    for (let i = 0; i < segLen; i++) {
      part += chars[crypto.randomInt(chars.length)];
    }
    parts.push(part);
  }
  return parts.join('-');
}

/**
 * Member CDK Service
 */
export const memberCdkService = {

  /**
   * Get CDK list with filters
   */
  async getCdks(filters, page, limit) {
    return await memberCdkModel.getCdksWithFilters(filters, page, limit);
  },

  /**
   * Get CDK by ID
   */
  async getCdkById(id) {
    return await memberCdkModel.findById(id);
  },

  /**
   * Create a single CDK
   */
  async createCdk(data) {
    // Generate unique code if not provided
    let code = data.cdk_code;
    if (!code) {
      let attempts = 0;
      do {
        code = generateCdkCode();
        const existing = await memberCdkModel.findByCode(code);
        if (!existing) break;
        attempts++;
      } while (attempts < 10);
    } else {
      // Check uniqueness
      const existing = await memberCdkModel.findByCode(code);
      if (existing) {
        throw new Error(`CDK码 ${code} 已存在`);
      }
    }

    return await memberCdkModel.create({
      cdk_code: code,
      member_level: data.member_level ?? 1,
      duration_months: data.duration_months ?? 3,
      status: data.status ?? 1,
      remark: data.remark || '',
      batch_no: data.batch_no || ''
    });
  },

  /**
   * Batch generate CDKs
   */
  async batchCreateCdks({ member_level, duration_months, count, remark }) {
    count = Math.min(parseInt(count) || 1, 200); // cap at 200
    const batchNo = `B${Date.now().toString(36).toUpperCase()}`;
    const records = [];
    const codes = new Set();

    // Generate unique codes
    for (let i = 0; i < count; i++) {
      let code;
      let attempts = 0;
      do {
        code = generateCdkCode();
        attempts++;
      } while (codes.has(code) && attempts < 50);
      codes.add(code);
      records.push({
        cdk_code: code,
        member_level: member_level ?? 1,
        duration_months: duration_months ?? 3,
        status: 1,
        remark: remark || '',
        batch_no: batchNo,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    await memberCdkModel.bulkInsert(records);
    return { batch_no: batchNo, count: records.length };
  },

  /**
   * Update CDK
   */
  async updateCdk(id, data) {
    const cdk = await memberCdkModel.findById(id);
    if (!cdk) throw new Error('CDK不存在');
    if (cdk.status === 2) throw new Error('已使用的CDK不能修改');

    // Prevent changing code if it's already used
    const updateData = { ...data };
    delete updateData.used_by;
    delete updateData.used_at;
    delete updateData.batch_no;

    // Check code uniqueness if changing
    if (updateData.cdk_code && updateData.cdk_code !== cdk.cdk_code) {
      const existing = await memberCdkModel.findByCode(updateData.cdk_code);
      if (existing) throw new Error(`CDK码 ${updateData.cdk_code} 已存在`);
    }

    return await memberCdkModel.update(id, updateData);
  },

  /**
   * Delete CDK
   */
  async deleteCdk(id) {
    const cdk = await memberCdkModel.findById(id);
    if (!cdk) throw new Error('CDK不存在');
    if (cdk.status === 2) throw new Error('已使用的CDK不能删除');
    return await memberCdkModel.delete(id);
  },

  /**
   * Batch delete CDKs
   */
  async batchDeleteCdks(ids) {
    const db = getDatabase();
    return await db('members_cdk')
      .whereIn('id', ids)
      .where('status', '!=', 2)
      .delete();
  },

  /**
   * Redeem CDK (web-facing, uses transaction)
   */
  async redeemCdk(cdkCode, memberId) {
    const db = getDatabase();

    return await db.transaction(async (trx) => {
      // 1. Find CDK (with row lock)
      const cdk = await trx('members_cdk')
        .where('cdk_code', cdkCode)
        .forUpdate()
        .first();

      if (!cdk) throw new Error('CDK码不存在');
      if (cdk.status === 0) throw new Error('该CDK已被禁用');
      if (cdk.status === 2) throw new Error('该CDK已被使用');

      // 2. Get member
      const member = await trx('members').where('id', memberId).first();
      if (!member) throw new Error('会员不存在');

      // 3. Calculate new expiry
      const now = new Date();
      let baseDate;

      // If current membership is still active, extend from expiry; otherwise from now
      if (member.member_expire_at && new Date(member.member_expire_at) > now) {
        baseDate = new Date(member.member_expire_at);
      } else {
        baseDate = now;
      }

      const months = cdk.duration_months || 3;
      const newExpireAt = new Date(baseDate);
      newExpireAt.setMonth(newExpireAt.getMonth() + months);

      // 4. Upgrade member level & expiry (take the higher level)
      const newLevel = Math.max(member.member_level || 0, cdk.member_level);
      await trx('members').where('id', memberId).update({
        member_level: newLevel,
        member_expire_at: newExpireAt,
        updated_at: now
      });

      // 5. Mark CDK as used
      await trx('members_cdk').where('id', cdk.id).update({
        status: 2,
        used_by: memberId,
        used_at: now,
        updated_at: now
      });

      return {
        member_level: newLevel,
        member_expire_at: newExpireAt,
        duration_months: months
      };
    });
  }
};

export default memberCdkService;
