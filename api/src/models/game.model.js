import { BaseModel } from './base.model.js';
import db from '../utils/db.js';

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
    let query = db('games as g')
      .leftJoin('game_category as gc', 'g.category_id', 'gc.id');

    if (filters.name) {
      query = query.where('g.name', 'like', `%${filters.name}%`);
    }
    if (filters.category_id !== undefined && filters.category_id !== null && filters.category_id !== '') {
      query = query.where('g.category_id', filters.category_id);
    }
    if (filters.member_level !== undefined && filters.member_level !== null && filters.member_level !== '') {
      query = query.where('g.member_level', filters.member_level);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query
      .select(
        'g.*',
        'gc.name as category_name'
      )
      .orderBy('g.id', 'desc')
      .limit(limit)
      .offset(offset);

    // Load all tags for name resolution
    const allTags = await db('game_tag').select('id', 'name');
    const tagMap = {};
    allTags.forEach(t => { tagMap[t.id] = t.name; });

    // Parse tag_ids JSON and resolve tag names
    const list = data.map(item => {
      const tagIds = typeof item.tag_ids === 'string' ? JSON.parse(item.tag_ids) : (item.tag_ids || []);
      const tagNames = tagIds.map(id => tagMap[id] || '').filter(Boolean);
      return {
        ...item,
        tag_ids: tagIds,
        tag_names: tagNames
      };
    });

    return {
      list,
      total,
      pageSize: limit,
      currentPage: page
    };
  }
}
