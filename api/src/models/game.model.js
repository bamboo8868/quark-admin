import { BaseModel } from './base.model.js';

/**
 * Game Model
 */
export class GameModel extends BaseModel {
  constructor() {
    super('games');
  }

  /**
   * Get games with filters and pagination
   */
  async getGamesWithFilters(filters = {}, page = 1, limit = 10) {
    let query = this.query();

    if (filters.name) {
      query = query.where('name', 'like', `%${filters.name}%`);
    }
    if (filters.category_id !== undefined && filters.category_id !== null && filters.category_id !== '') {
      query = query.where('category_id', filters.category_id);
    }
    if (filters.member_level !== undefined && filters.member_level !== null && filters.member_level !== '') {
      query = query.where('member_level', filters.member_level);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    // Parse tag_ids JSON for each record
    const list = data.map(item => ({
      ...item,
      tag_ids: typeof item.tag_ids === 'string' ? JSON.parse(item.tag_ids) : item.tag_ids
    }));

    return {
      list,
      total,
      pageSize: limit,
      currentPage: page
    };
  }
}
