import { BaseModel } from './base.model.js';

/**
 * Login Log Model
 */
export class LoginLogModel extends BaseModel {
  constructor() {
    super('login_logs');
  }

  /**
   * Get login logs with filters
   */
  async getLogs(filters = {}, page = 1, limit = 10) {
    const { username, status } = filters;
    
    let query = this.query();

    if (username) {
      query = query.where('username', 'like', `%${username}%`);
    }
    if (status !== undefined) {
      query = query.where('status', status);
    }

    // Get total count
    const countQuery = this.query();
    if (username) countQuery.where('username', 'like', `%${username}%`);
    if (status !== undefined) countQuery.where('status', status);
    
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    // Get paginated results
    const list = await query
      .orderBy('login_time', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const formattedList = list.map(log => ({
      id: log.id,
      username: log.username,
      ip: log.ip,
      address: log.address,
      system: log.system,
      browser: log.browser,
      status: log.status,
      behavior: log.behavior,
      loginTime: log.login_time
    }));

    return {
      list: formattedList,
      total,
      pageSize: limit,
      currentPage: page
    };
  }
}

/**
 * Operation Log Model
 */
export class OperationLogModel extends BaseModel {
  constructor() {
    super('operation_logs');
  }

  /**
   * Get operation logs with filters
   */
  async getLogs(filters = {}, page = 1, limit = 10) {
    const { module, status } = filters;
    
    let query = this.query();

    if (module) {
      query = query.where('module', 'like', `%${module}%`);
    }
    if (status !== undefined) {
      query = query.where('status', status);
    }

    // Get total count
    const countQuery = this.query();
    if (module) countQuery.where('module', 'like', `%${module}%`);
    if (status !== undefined) countQuery.where('status', status);
    
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    // Get paginated results
    const list = await query
      .orderBy('operating_time', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const formattedList = list.map(log => ({
      id: log.id,
      username: log.username,
      ip: log.ip,
      address: log.address,
      system: log.system,
      browser: log.browser,
      status: log.status,
      summary: log.summary,
      module: log.module,
      operatingTime: log.operating_time
    }));

    return {
      list: formattedList,
      total,
      pageSize: limit,
      currentPage: page
    };
  }
}

/**
 * System Log Model
 */
export class SystemLogModel extends BaseModel {
  constructor() {
    super('system_logs');
  }

  /**
   * Get system logs with filters
   */
  async getLogs(filters = {}, page = 1, limit = 10) {
    const { module } = filters;
    
    let query = this.query();

    if (module) {
      query = query.where('module', 'like', `%${module}%`);
    }

    // Get total count
    const countQuery = this.query();
    if (module) countQuery.where('module', 'like', `%${module}%`);
    
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    // Get paginated results
    const list = await query
      .orderBy('request_time', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const formattedList = list.map(log => ({
      id: log.id,
      level: log.level,
      module: log.module,
      url: log.url,
      method: log.method,
      ip: log.ip,
      address: log.address,
      system: log.system,
      browser: log.browser,
      takesTime: log.takes_time,
      requestTime: log.request_time
    }));

    return {
      list: formattedList,
      total,
      pageSize: limit,
      currentPage: page
    };
  }

  /**
   * Get log detail by ID
   */
  async getDetail(id) {
    const log = await this.findById(id);
    if (!log) return null;

    return {
      id: log.id,
      level: log.level,
      module: log.module,
      url: log.url,
      method: log.method,
      ip: log.ip,
      address: log.address,
      system: log.system,
      browser: log.browser,
      takesTime: log.takes_time,
      responseHeaders: log.response_headers ? JSON.parse(log.response_headers) : null,
      responseBody: log.response_body ? JSON.parse(log.response_body) : null,
      requestHeaders: log.request_headers ? JSON.parse(log.request_headers) : null,
      requestBody: log.request_body ? JSON.parse(log.request_body) : null,
      traceId: log.trace_id,
      requestTime: log.request_time
    };
  }
}

/**
 * Online User Model
 */
export class OnlineUserModel extends BaseModel {
  constructor() {
    super('online_users');
  }

  /**
   * Get online users with filters
   */
  async getUsers(filters = {}, page = 1, limit = 10) {
    const { username } = filters;
    
    let query = this.query();

    if (username) {
      query = query.where('username', 'like', `%${username}%`);
    }

    // Get total count
    const countQuery = this.query();
    if (username) countQuery.where('username', 'like', `%${username}%`);
    
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    // Get paginated results
    const list = await query
      .orderBy('login_time', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const formattedList = list.map(user => ({
      id: user.id,
      username: user.username,
      ip: user.ip,
      address: user.address,
      system: user.system,
      browser: user.browser,
      loginTime: user.login_time
    }));

    return {
      list: formattedList,
      total,
      pageSize: limit,
      currentPage: page
    };
  }

  /**
   * Remove expired users
   */
  async removeExpired() {
    return await this.query()
      .where('expire_time', '<', new Date())
      .del();
  }
}

export default {
  loginLog: new LoginLogModel(),
  operationLog: new OperationLogModel(),
  systemLog: new SystemLogModel(),
  onlineUser: new OnlineUserModel()
};
