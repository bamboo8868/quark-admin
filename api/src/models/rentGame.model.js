import { BaseModel } from './base.model.js';

export class RentGameModel extends BaseModel {
  constructor() {
    super('rent_games');
  }

  async getGamesWithFilters(filters = {}, page = 1, limit = 10) {
    let query = this.query();

    if (filters.name) {
      query = query.where('name', 'like', `%${filters.name}%`);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('status', filters.status);
    }
    if (filters.platform) {
      query = query.where('platform', filters.platform);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('id', 'desc').limit(limit).offset(offset);

    return { list: data, total, pageSize: limit, currentPage: page };
  }
}
