import { getDatabase } from '../config/database.js';
import { queryOptimizer } from '../utils/optimizer.js';
import { log } from '../utils/logger.js';

/**
 * Base model class with common CRUD operations
 */
export class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = getDatabase();
    this.queryOptimizer = queryOptimizer;
  }

  /**
   * Execute query with optimization tracking
   */
  async executeQuery(queryBuilder, operation = 'query') {
    const start = Date.now();
    const sql = queryBuilder.toSQL ? queryBuilder.toSQL().sql : queryBuilder.toString();
    
    try {
      const result = await queryBuilder;
      const duration = Date.now() - start;
      
      // Track query performance
      this.queryOptimizer.trackQuery(sql, duration, Array.isArray(result) ? result.length : 1);
      
      return result;
    } catch (error) {
      log.error('Query execution error', error, { sql: sql.substring(0, 200) });
      throw error;
    }
  }

  /**
   * Get query builder for this table
   */
  query() {
    return this.db(this.tableName);
  }

  /**
   * Find all records
   */
  async findAll(options = {}) {
    const { 
      page = 1, 
      limit = 10, 
      orderBy = 'created_at', 
      order = 'desc',
      where = {},
      select = ['*']
    } = options;

    const offset = (page - 1) * limit;
    
    let query = this.query().select(select);
    
    // Apply where conditions
    if (Object.keys(where).length > 0) {
      query = query.where(where);
    }
    
    // Get total count
    const countQuery = this.query();
    if (Object.keys(where).length > 0) {
      countQuery.where(where);
    }
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);
    
    // Get paginated results with optimization
    const data = await this.executeQuery(
      query.orderBy(orderBy, order).limit(limit).offset(offset),
      'findAll'
    );
    
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  /**
   * Find record by ID with optimization
   */
  async findById(id, select = ['*']) {
    const result = await this.executeQuery(
      this.query().select(select).where('id', id).first(),
      'findById'
    );
    
    return result || null;
  }

  /**
   * Find one record by conditions
   */
  async findOne(where, select = ['*']) {
    const result = await this.query()
      .select(select)
      .where(where)
      .first();
    
    return result || null;
  }

  /**
   * Create new record with optimization
   */
  async create(data) {
    const [id] = await this.executeQuery(
      this.query().insert(data),
      'create'
    );
    return this.findById(id);
  }

  /**
   * Update record by ID with optimization
   */
  async update(id, data) {
    await this.executeQuery(
      this.query().where('id', id).update({
        ...data,
        updated_at: new Date()
      }),
      'update'
    );
    
    return this.findById(id);
  }

  /**
   * Delete record by ID
   */
  async delete(id) {
    const deleted = await this.query()
      .where('id', id)
      .del();
    
    return deleted > 0;
  }

  /**
   * Soft delete record by ID
   */
  async softDelete(id) {
    const result = await this.query()
      .where('id', id)
      .update({
        deleted_at: new Date(),
        updated_at: new Date()
      });
    
    return result > 0;
  }

  /**
   * Count records
   */
  async count(where = {}) {
    let query = this.query();
    
    if (Object.keys(where).length > 0) {
      query = query.where(where);
    }
    
    const [{ count }] = await query.count('* as count');
    return parseInt(count, 10);
  }

  /**
   * Check if record exists
   */
  async exists(where) {
    const result = await this.query()
      .where(where)
      .first('id');
    
    return !!result;
  }

  /**
   * Update or create record
   */
  async updateOrCreate(where, data) {
    const existing = await this.findOne(where);
    
    if (existing) {
      return this.update(existing.id, { ...data });
    }
    
    return this.create({ ...where, ...data });
  }

  /**
   * Bulk insert records
   */
  async bulkInsert(dataArray) {
    return await this.query().insert(dataArray);
  }

  /**
   * Bulk update records
   */
  async bulkUpdate(ids, data) {
    return await this.query()
      .whereIn('id', ids)
      .update({
        ...data,
        updated_at: new Date()
      });
  }

  /**
   * Raw query execution
   */
  async raw(query, bindings = []) {
    return await this.db.raw(query, bindings);
  }

  /**
   * Transaction wrapper
   */
  async transaction(callback) {
    return await this.db.transaction(callback);
  }
}

export default BaseModel;
