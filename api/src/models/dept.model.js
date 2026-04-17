import { BaseModel } from './base.model.js';

/**
 * Department Model
 */
export class DeptModel extends BaseModel {
  constructor() {
    super('depts');
  }

  /**
   * Transform frontend data to database format
   */
  toDbFormat(data) {
    const dbData = {};
    
    // Map camelCase to snake_case
    const fieldMap = {
      parentId: 'parent_id',
      name: 'name',
      sort: 'sort',
      phone: 'phone',
      principal: 'principal',
      email: 'email',
      status: 'status',
      type: 'type',
      remark: 'remark'
    };
    
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if (data[key] !== undefined) {
        dbData[dbKey] = data[key];
      }
    }
    
    return dbData;
  }

  /**
   * Create department with data mapping
   */
  async create(data) {
    const dbData = this.toDbFormat(data);
    console.log('DeptModel.create - Input:', data);
    console.log('DeptModel.create - DB Format:', dbData);
    return await super.create(dbData);
  }

  /**
   * Update department with data mapping
   */
  async update(id, data) {
    const dbData = this.toDbFormat(data);
    return await super.update(id, dbData);
  }

  /**
   * Get all departments in tree structure
   */
  async getDeptTree() {
    const depts = await this.query()
      .orderBy('sort', 'asc')
      .orderBy('id', 'asc');
    
    return this.buildTree(depts);
  }

  /**
   * Get all departments as flat list
   */
  async getAllDepts() {
    const depts = await this.query()
      .orderBy('sort', 'asc')
      .orderBy('id', 'asc');
    
    return depts.map(dept => this.formatDept(dept));
  }

  /**
   * Build tree structure from flat list
   */
  buildTree(depts, parentId = 0) {
    const result = [];
    
    for (const dept of depts) {
      if (dept.parent_id === parentId) {
        const children = this.buildTree(depts, dept.id);
        const formatted = this.formatDept(dept);
        if (children.length > 0) {
          formatted.children = children;
        }
        result.push(formatted);
      }
    }
    
    return result;
  }

  /**
   * Format department for response
   */
  formatDept(dept) {
    return {
      id: dept.id,
      name: dept.name,
      parentId: dept.parent_id,
      sort: dept.sort,
      phone: dept.phone,
      principal: dept.principal,
      email: dept.email,
      status: dept.status,
      type: dept.type,
      remark: dept.remark,
      createTime: new Date(dept.created_at).getTime()
    };
  }
}

export default new DeptModel();
