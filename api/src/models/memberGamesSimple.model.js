import { BaseModel } from './base.model.js';

/**
 * MemberGamesSimple Model
 * 会员简易游戏库：游戏名称 / 游戏账号 / 密码 / 动态验证码密钥
 * 列表不返回密钥原文，仅返回 has_secret 标记；动态验证码按需单独生成。
 */
export class MemberGamesSimpleModel extends BaseModel {
  constructor() {
    super('member_games_simple');
  }

  /**
   * Get member games with filters and pagination.
   * filters: { name } 模糊匹配游戏名称或账号
   */
  async getGamesWithFilters(filters = {}, page = 1, limit = 10) {
    let query = this.query().where('status', 1);

    if (filters.name) {
      const kw = `%${filters.name}%`;
      query = query.andWhere(function () {
        this.where('game_name', 'like', kw).orWhere('account', 'like', kw);
      });
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const rows = await query
      .select('id', 'game_name', 'account', 'password', 'code', 'created_at')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    // Never expose the raw shared secret; only whether a TOTP can be generated.
    const list = rows.map((r) => ({
      id: r.id,
      game_name: r.game_name,
      account: r.account,
      password: r.password,
      has_secret: !!r.code,
      created_at: r.created_at
    }));

    return {
      list,
      total,
      pageSize: limit,
      currentPage: page
    };
  }
}

export default MemberGamesSimpleModel;
