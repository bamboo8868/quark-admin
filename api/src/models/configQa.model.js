import { BaseModel } from './base.model.js';

export class ConfigQaModel extends BaseModel {
  constructor() {
    super('config_qa');
  }

  async getQasWithFilters(filters = {}, page = 1, limit = 10) {
    let query = this.query();

    if (filters.question) {
      query = query.where('question', 'like', `%${filters.question}%`);
    }
    if (filters.type) {
      query = query.where('type', filters.type);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('status', filters.status);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query
      .orderBy('sort', 'asc')
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset);

    return { list: data, total, pageSize: limit, currentPage: page };
  }
}
