/**
 * Service Registry Server
 * Central service discovery and registration center
 * All services (gateway, logic servers) register here
 */

import net from 'net';
import RpcMessage from '../protocol/message.js';
import RpcHeader, { HEADER_SIZE } from '../protocol/header.js';
import { EventEmitter } from 'events';

export class ServiceInfo {
  constructor(id, type, host, port, metadata = {}) {
    this.id = id;
    this.type = type; // 'gateway', 'logic', 'client'
    this.host = host;
    this.port = port;
    this.metadata = metadata;
    this.socket = null;
    this.connected = false;
    this.lastHeartbeat = Date.now();
    this.registeredAt = Date.now();
    this.requestCount = 0;
    this.status = 'active'; // active, inactive, down
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      host: this.host,
      port: this.port,
      metadata: this.metadata,
      status: this.status,
      registeredAt: this.registeredAt,
      lastHeartbeat: this.lastHeartbeat,
      requestCount: this.requestCount
    };
  }
}

export class RegistryServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 8500;
    this.host = options.host || '0.0.0.0';
    this.server = null;
    
    // Service storage
    this.services = new Map(); // id -> ServiceInfo
    this.servicesByType = new Map(); // type -> Set<serviceId>
    
    // Client connections
    this.connections = new Map();
    
    // Health check
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.heartbeatTimeout = options.heartbeatTimeout || 60000;
    this.healthCheckTimer = null;
    
    // Watchers for service changes
    this.watchers = new Map(); // serviceType -> Set<connectionId>
  }

  /**
   * Start registry server
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer(this.handleConnection.bind(this));
      
      this.server.on('error', reject);
      
      this.server.listen(this.port, this.host, () => {
        console.log(`[Registry] Service Registry started on ${this.host}:${this.port}`);
        this.startHealthCheck();
        resolve();
      });
    });
  }

  /**
   * Handle incoming connections
   */
  handleConnection(socket) {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[Registry] Client connected: ${clientId}`);
    
    this.connections.set(clientId, {
      socket,
      connectedAt: Date.now(),
      subscriptions: new Set()
    });

    let buffer = Buffer.alloc(0);

    socket.on('data', async (data) => {
      buffer = Buffer.concat([buffer, data]);

      while (buffer.length >= HEADER_SIZE) {
        try {
          const header = RpcHeader.decode(buffer.slice(0, HEADER_SIZE));
          const messageLength = HEADER_SIZE + header.routeLength + header.bodyLength;

          if (buffer.length < messageLength) break;

          const messageBuffer = buffer.slice(0, messageLength);
          buffer = buffer.slice(messageLength);

          await this.handleRequest(clientId, messageBuffer, header);
        } catch (err) {
          console.error('[Registry] Parse error:', err.message);
          buffer = Buffer.alloc(0);
          break;
        }
      }
    });

    socket.on('close', () => {
      console.log(`[Registry] Client disconnected: ${clientId}`);
      this.handleDisconnect(clientId);
    });

    socket.on('error', (err) => {
      console.error(`[Registry] Client error ${clientId}:`, err.message);
    });
  }

  /**
   * Handle registry requests
   */
  async handleRequest(clientId, messageBuffer, header) {
    const message = new RpcMessage();
    await message.init();
    await message.decode(messageBuffer);

    const route = message.route;
    const body = message.body;

    try {
      let result;

      switch (route) {
        // Registration
        case 'registry.register':
          result = await this.handleRegister(body, clientId);
          break;
        case 'registry.unregister':
          result = await this.handleUnregister(body);
          break;
        case 'registry.heartbeat':
          result = await this.handleHeartbeat(body);
          break;
        
        // Discovery
        case 'registry.discover':
          result = await this.handleDiscover(body);
          break;
        case 'registry.discoverOne':
          result = await this.handleDiscoverOne(body);
          break;
        case 'registry.list':
          result = await this.handleList(body);
          break;
        
        // Watching
        case 'registry.watch':
          result = await this.handleWatch(clientId, body);
          break;
        case 'registry.unwatch':
          result = await this.handleUnwatch(clientId, body);
          break;
        
        // Stats
        case 'registry.stats':
          result = this.getStats();
          break;
        
        default:
          throw new Error(`Unknown route: ${route}`);
      }

      // Send success response
      const response = await RpcMessage.createResponse(header.requestId, result, 0);
      const client = this.connections.get(clientId);
      if (client) {
        const responseBuffer = await response.encode();
        client.socket.write(responseBuffer);
      }

    } catch (err) {
      console.error(`[Registry] Route ${route} error:`, err.message);
      await this.sendError(clientId, header.requestId, err.message, 400);
    }
  }

  /**
   * Handle service registration
   */
  async handleRegister(body, clientId) {
    const { id, type, host, port, metadata = {} } = body;

    if (!id || !type || !host || !port) {
      throw new Error('Missing required fields: id, type, host, port');
    }

    // Validate type
    if (!['gateway', 'logic', 'client'].includes(type)) {
      throw new Error(`Invalid service type: ${type}`);
    }

    // Check if already registered
    if (this.services.has(id)) {
      const existing = this.services.get(id);
      existing.lastHeartbeat = Date.now();
      existing.status = 'active';
      existing.metadata = { ...existing.metadata, ...metadata };
      console.log(`[Registry] Service ${id} re-registered`);
      return { success: true, message: 'Service re-registered', service: existing.toJSON() };
    }

    // Create new service
    const service = new ServiceInfo(id, type, host, port, metadata);
    service.clientId = clientId;
    this.services.set(id, service);

    // Index by type
    if (!this.servicesByType.has(type)) {
      this.servicesByType.set(type, new Set());
    }
    this.servicesByType.get(type).add(id);

    console.log(`[Registry] Service registered: ${id} (${type}) at ${host}:${port}`);

    // Notify watchers
    this.notifyWatchers(type, 'serviceUp', service.toJSON());

    // Emit event
    this.emit('serviceRegistered', { id, type, host, port, metadata });

    return { success: true, message: 'Service registered', service: service.toJSON() };
  }

  /**
   * Handle service unregistration
   */
  async handleUnregister(body) {
    const { id } = body;

    if (!this.services.has(id)) {
      throw new Error(`Service not found: ${id}`);
    }

    const service = this.services.get(id);
    const type = service.type;

    // Remove from services
    this.services.delete(id);

    // Remove from type index
    const typeSet = this.servicesByType.get(type);
    if (typeSet) {
      typeSet.delete(id);
      if (typeSet.size === 0) {
        this.servicesByType.delete(type);
      }
    }

    console.log(`[Registry] Service unregistered: ${id}`);

    // Notify watchers
    this.notifyWatchers(type, 'serviceDown', { id, type });

    this.emit('serviceUnregistered', { id, type });

    return { success: true, message: 'Service unregistered', id };
  }

  /**
   * Handle heartbeat
   */
  async handleHeartbeat(body) {
    const { id, stats } = body;

    const service = this.services.get(id);
    if (!service) {
      throw new Error(`Service not found: ${id}`);
    }

    service.lastHeartbeat = Date.now();
    service.status = 'active';
    
    if (stats) {
      service.requestCount = stats.requestCount || service.requestCount;
    }

    return { 
      success: true, 
      timestamp: Date.now(),
      registeredServices: this.services.size
    };
  }

  /**
   * Handle service discovery (all matching services)
   */
  async handleDiscover(body) {
    const { type, tags } = body || {};

    let services = [];

    if (type) {
      // Get by type
      const ids = this.servicesByType.get(type) || new Set();
      services = Array.from(ids)
        .map(id => this.services.get(id))
        .filter(s => s && s.status === 'active')
        .map(s => s.toJSON());
    } else {
      // Get all active services
      services = Array.from(this.services.values())
        .filter(s => s.status === 'active')
        .map(s => s.toJSON());
    }

    // Filter by tags if specified
    if (tags && tags.length > 0) {
      services = services.filter(s => 
        tags.some(tag => s.metadata.tags?.includes(tag))
      );
    }

    return { services, count: services.length };
  }

  /**
   * Handle service discovery (one service with load balancing)
   */
  async handleDiscoverOne(body) {
    const { type, strategy = 'round-robin' } = body || {};

    const ids = this.servicesByType.get(type);
    if (!ids || ids.size === 0) {
      return { service: null };
    }

    const services = Array.from(ids)
      .map(id => this.services.get(id))
      .filter(s => s && s.status === 'active');

    if (services.length === 0) {
      return { service: null };
    }

    // Simple round-robin selection
    const service = services[Math.floor(Math.random() * services.length)];
    
    return { service: service.toJSON() };
  }

  /**
   * Handle list all services
   */
  async handleList(body) {
    const { type, status } = body || {};

    let services = Array.from(this.services.values());

    if (type) {
      services = services.filter(s => s.type === type);
    }

    if (status) {
      services = services.filter(s => s.status === status);
    }

    return { 
      services: services.map(s => s.toJSON()),
      count: services.length,
      byType: {
        gateway: this.servicesByType.get('gateway')?.size || 0,
        logic: this.servicesByType.get('logic')?.size || 0,
        client: this.servicesByType.get('client')?.size || 0
      }
    };
  }

  /**
   * Handle watch for service changes
   */
  async handleWatch(clientId, body) {
    const { type } = body;

    if (!this.watchers.has(type)) {
      this.watchers.set(type, new Set());
    }
    this.watchers.get(type).add(clientId);

    const client = this.connections.get(clientId);
    if (client) {
      client.subscriptions.add(type);
    }

    // Send current services of this type
    const ids = this.servicesByType.get(type) || new Set();
    const services = Array.from(ids)
      .map(id => this.services.get(id))
      .filter(s => s && s.status === 'active')
      .map(s => s.toJSON());

    return { success: true, type, services };
  }

  /**
   * Handle unwatch
   */
  async handleUnwatch(clientId, body) {
    const { type } = body;

    const typeWatchers = this.watchers.get(type);
    if (typeWatchers) {
      typeWatchers.delete(clientId);
    }

    const client = this.connections.get(clientId);
    if (client) {
      client.subscriptions.delete(type);
    }

    return { success: true, type };
  }

  /**
   * Notify watchers of service changes
   */
  async notifyWatchers(type, event, data) {
    const watchers = this.watchers.get(type);
    if (!watchers || watchers.size === 0) return;

    const message = await RpcMessage.createRequest('registry.notify', {
      type,
      event,
      data,
      timestamp: Date.now()
    });
    const buffer = await message.encode();

    for (const clientId of watchers) {
      const client = this.connections.get(clientId);
      if (client && !client.socket.destroyed) {
        client.socket.write(buffer);
      }
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(clientId) {
    const client = this.connections.get(clientId);
    if (!client) return;

    // Remove from watchers
    for (const type of client.subscriptions) {
      const watchers = this.watchers.get(type);
      if (watchers) {
        watchers.delete(clientId);
      }
    }

    // Mark services from this connection as down
    for (const [id, service] of this.services) {
      if (service.clientId === clientId) {
        service.status = 'down';
        console.log(`[Registry] Service ${id} marked as down (connection lost)`);
        this.notifyWatchers(service.type, 'serviceDown', { id, type: service.type });
      }
    }

    this.connections.delete(clientId);
  }

  /**
   * Send error response
   */
  async sendError(clientId, requestId, message, status) {
    const client = this.connections.get(clientId);
    if (!client) return;

    const response = await RpcMessage.createResponse(requestId, { error: message }, status);
    const buffer = await response.encode();
    client.socket.write(buffer);
  }

  /**
   * Start health check timer
   */
  startHealthCheck() {
    this.healthCheckTimer = setInterval(() => {
      this.checkHealth();
    }, this.heartbeatInterval);
  }

  /**
   * Check health of all services
   */
  checkHealth() {
    const now = Date.now();
    for (const [id, service] of this.services) {
      if (service.status === 'down') continue;

      if (now - service.lastHeartbeat > this.heartbeatTimeout) {
        console.warn(`[Registry] Service ${id} heartbeat timeout`);
        service.status = 'inactive';
        this.notifyWatchers(service.type, 'serviceDown', { id, type: service.type });
        this.emit('serviceTimeout', { id, type: service.type });
      }
    }
  }

  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalServices: this.services.size,
      connections: this.connections.size,
      byType: {
        gateway: this.servicesByType.get('gateway')?.size || 0,
        logic: this.servicesByType.get('logic')?.size || 0,
        client: this.servicesByType.get('client')?.size || 0
      },
      services: Array.from(this.services.values()).map(s => s.toJSON())
    };
  }

  /**
   * Stop registry server
   */
  stop() {
    return new Promise((resolve) => {
      clearInterval(this.healthCheckTimer);

      // Close all connections
      for (const client of this.connections.values()) {
        client.socket.destroy();
      }
      this.connections.clear();

      if (this.server) {
        this.server.close(() => {
          console.log('[Registry] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default RegistryServer;
