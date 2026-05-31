import { BaseModel } from './base.model.js';

/**
 * AccountAccessRecords Model
 * Manages account access records with view time tracking
 */
export class AccountAccessRecordsModel extends BaseModel {
  constructor() {
    super('account_access_records');
  }

  /**
   * Get records with filters and pagination
   */
  async getRecordsWithFilters(filters = {}, page = 1, limit = 10) {
    let query = this.query();

    if (filters.account) {
      query = query.where('account', 'like', `%${filters.account}%`);
    }
    if (filters.game_name) {
      query = query.where('game_name', 'like', `%${filters.game_name}%`);
    }

    // Get total count
    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    // Get paginated results
    const offset = (page - 1) * limit;
    const hasFilters = filters.account || filters.game_name;
    const data = hasFilters
      ? await query.orderBy('view_count_24h', 'asc').orderBy('id', 'desc').limit(limit).offset(offset)
      : await query.orderBy('id', 'desc').limit(limit).offset(offset);

    return {
      list: data,
      total,
      pageSize: limit,
      currentPage: page
    };
  }

  /**
   * Record a view time (append to view_times JSON array, keep last 5)
   * Also increment view_count_24h if within 24h window
   */
  async recordView(id) {
    const record = await this.findById(id);
    if (!record) return null;

    const now = new Date().toISOString();

    // Parse existing view_times (JSON array)
    let viewTimes = [];
    try {
      viewTimes = typeof record.view_times === 'string'
        ? JSON.parse(record.view_times)
        : (record.view_times || []);
    } catch {
      viewTimes = [];
    }

    // Append current time and keep last 5
    viewTimes.push(now);
    if (viewTimes.length > 5) {
      viewTimes = viewTimes.slice(-5);
    }

    // Count views in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const viewCount24h = viewTimes.filter(t => t >= oneDayAgo).length;

    await this.query()
      .where('id', id)
      .update({
        view_times: JSON.stringify(viewTimes),
        view_count_24h: viewCount24h,
        updated_at: new Date()
      });

    return this.findById(id);
  }
}
