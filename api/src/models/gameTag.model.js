import { BaseModel } from './base.model.js';

/**
 * GameTag Model
 */
export class GameTagModel extends BaseModel {
  constructor() {
    super('game_tag');
  }

  /**
   * Get tags with filters and pagination
   */
  async getTagsWithFilters(filters = {}, page = 1, limit = 10) {
    let query = this.query();

    if (filters.name) {
      query = query.where('name', 'like', `%${filters.name}%`);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      list: data,
      total,
      pageSize: limit,
      currentPage: page
    };
  }
}
