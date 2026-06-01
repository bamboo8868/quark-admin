import { BaseModel } from './base.model.js';

/**
 * GameCategory Model
 */
export class GameCategoryModel extends BaseModel {
  constructor() {
    super('game_category');
  }

  /**
   * Get categories with filters and pagination
   */
  async getCategoriesWithFilters(filters = {}, page = 1, limit = 10) {
    let query = this.query();

    if (filters.name) {
      query = query.where('name', 'like', `%${filters.name}%`);
    }
    if (filters.visible !== undefined && filters.visible !== null && filters.visible !== '') {
      query = query.where('visible', filters.visible);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query
      .orderBy('sort_order', 'asc')
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
