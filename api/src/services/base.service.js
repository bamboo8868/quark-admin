import { NotFoundError, ConflictError } from '../middlewares/error.middleware.js';

/**
 * Base service class with common business logic
 */
export class BaseService {
  constructor(model) {
    this.model = model;
  }

  /**
   * Get all records with pagination
   */
  async findAll(query = {}) {
    return await this.model.findAll(query);
  }

  /**
   * Get record by ID
   */
  async findById(id) {
    const record = await this.model.findById(id);
    
    if (!record) {
      throw new NotFoundError(`${this.model.tableName} not found`);
    }
    
    return record;
  }

  /**
   * Create new record
   */
  async create(data) {
    try {
      return await this.model.create(data);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
        throw new ConflictError(`${this.model.tableName} already exists`);
      }
      throw error;
    }
  }

  /**
   * Update record
   */
  async update(id, data) {
    // Check if record exists
    const existing = await this.model.findById(id);
    
    if (!existing) {
      throw new NotFoundError(`${this.model.tableName} not found`);
    }
    
    try {
      return await this.model.update(id, data);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' || error.code === '23505') {
        throw new ConflictError(`${this.model.tableName} already exists`);
      }
      throw error;
    }
  }

  /**
   * Delete record
   */
  async delete(id) {
    const existing = await this.model.findById(id);
    
    if (!existing) {
      throw new NotFoundError(`${this.model.tableName} not found`);
    }
    
    return await this.model.delete(id);
  }

  /**
   * Soft delete record
   */
  async softDelete(id) {
    const existing = await this.model.findById(id);
    
    if (!existing) {
      throw new NotFoundError(`${this.model.tableName} not found`);
    }
    
    return await this.model.softDelete(id);
  }

  /**
   * Check if record exists
   */
  async exists(where) {
    return await this.model.exists(where);
  }

  /**
   * Count records
   */
  async count(where = {}) {
    return await this.model.count(where);
  }

  /**
   * Execute within transaction
   */
  async transaction(callback) {
    return await this.model.transaction(callback);
  }
}

export default BaseService;
