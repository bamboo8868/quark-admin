/**
 * RPC Gateway Server
 * Acts as entry point, handles load balancing, service discovery, and routing to logic servers
 */

import net from 'net';
import RpcMessage from '../protocol/message.js';
import RpcHeader, { HEADER_SIZE } from '../protocol/header.js';
import { EventEmitter } from 'events';
import { WebSocketHandler } from './websocket-handler.js';

/**
 * Logic Server Info
 * Stores information about a registered logic server
 */
export class LogicServerInfo {
  constructor(id, host, port, metadata = {}) {
    this.id = id;
    this.host = host;
    this.port = port;
    this.metadata = metadata;
    this.socket = null;
    this.connected = false;
    this.lastHeartbeat = Date.now();
    this.requestCount = 0;
    this.activeRequests = 0;
    this.weight = metadata.weight || 1;
    this.clientId = null;
  }

  get load() {
    return this.activeRequests / this.weight;
  }

  toJSON() {
    return {
      id: this.id,
      host: this.host,
      port: this.port,
      connected: this.connected,
      load: this.load,
      requestCount: this.requestCount,
      activeRequests: this.activeRequests,
      metadata: this.metadata
    };
  }
}

/**
 * Gateway Server
 * Entry point for RPC clients, handles routing and load balancing
 */
export class GatewayServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 8080;
    this.host = options.host || '0.0.0.0';
    this.server = null;
    
    // Logic server management
    this.logicServers = new Map();
    this.clientConnections = new Map();
    this.pendingRequests = new Map();
    
    // Load balancing
    this.strategy = options.strategy || 'least-connections';
    this.roundRobinIndex = 0;
    
    // Health check
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.heartbeatTimeout = options.heartbeatTimeout || 10000;
    this.healthCheckTimer = null;
    
    // WebSocket support
    this.enableWebSocket = options.enableWebSocket !== false;
    this.webSocketPort = options.webSocketPort || 8081;
    this.webSocketHandler = null;
  }

  /**
   * Start gateway server
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer(this.handleClientConnection.bind(this));
      
      this.server.on('error', reject);
      
      this.server.listen(this.port, this.host, async () => {
        console.log(`[Gateway] TCP Server started on ${this.host}:${this.port}`);
        
        // Start WebSocket server if enabled
        if (this.enableWebSocket) {
          this.webSocketHandler = new WebSocketHandler(this, {
            port: this.webSocketPort,
            host: this.host
          });
          await this.webSocketHandler.start();
        }
        
        this.startHealthCheck();
        resolve();
      });
    });
  }

  /**
   * Handle client connections
   */
  handleClientConnection(socket) {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[Gateway] Client connected: ${clientId}`);
    
    this.clientConnections.set(clientId, {
      socket,
      connectedAt: Date.now()
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

          await this.handleClientRequest(clientId, messageBuffer, header);
        } catch (err) {
          console.error('[Gateway] Parse error:', err.message);
          buffer = Buffer.alloc(0);
          break;
        }
      }
    });

    socket.on('close', () => {
      console.log(`[Gateway] Client disconnected: ${clientId}`);
      this.clientConnections.delete(clientId);
      this.cleanupClientRequests(clientId);
    });

    socket.on('error', (err) => {
      console.error(`[Gateway] Client error ${clientId}:`, err.message);
    });
  }

  /**
   * Handle client request - route to logic server
   */
  async handleClientRequest(clientId, messageBuffer, header) {
    // Decode message to check for internal routes
    const message = new RpcMessage();
    await message.init();
    await message.decode(messageBuffer);

    // Handle internal gateway routes
    if (message.route.startsWith('gateway.')) {
      await this.handleGatewayRoute(clientId, message, header);
      return;
    }

    const logicServer = this.selectLogicServer(header.route);
    
    if (!logicServer) {
      console.error('[Gateway] No available logic server');
      await this.sendErrorToClient(clientId, header.requestId, 'Service unavailable', 503);
      return;
    }

    // Store pending request
    const requestKey = `${clientId}:${header.requestId}`;
    this.pendingRequests.set(requestKey, {
      clientId,
      requestId: header.requestId,
      logicServerId: logicServer.id,
      startTime: Date.now()
    });

    logicServer.activeRequests++;

    try {
      // Connect to logic server if not connected
      if (!logicServer.connected) {
        await this.connectToLogicServer(logicServer);
      }

      // Forward request to logic server
      logicServer.socket.write(messageBuffer);
    } catch (err) {
      console.error('[Gateway] Failed to forward request:', err.message);
      logicServer.connected = false;
      this.pendingRequests.delete(requestKey);
      logicServer.activeRequests--;
      await this.sendErrorToClient(clientId, header.requestId, 'Service error', 500);
    }
  }

  /**
   * Handle internal gateway routes (registration, heartbeat, etc.)
   */
  async handleGatewayRoute(clientId, message, header) {
    const route = message.route;
    const body = message.body;

    try {
      let result;

      switch (route) {
        case 'gateway.register':
          result = await this.handleServiceRegister(body, clientId);
          break;
        case 'gateway.unregister':
          result = await this.handleServiceUnregister(body);
          break;
        case 'gateway.heartbeat':
          result = await this.handleServiceHeartbeat(body);
          break;
        case 'gateway.discover':
          result = await this.handleServiceDiscovery(body);
          break;
        case 'gateway.stats':
          result = this.getStats();
          break;
        default:
          throw new Error(`Unknown gateway route: ${route}`);
      }

      // Send success response
      const response = await RpcMessage.createResponse(header.requestId, result, 0);
      const client = this.clientConnections.get(clientId);
      if (client) {
        const responseBuffer = await response.encode();
        client.socket.write(responseBuffer);
      }

    } catch (err) {
      console.error(`[Gateway] Route ${route} error:`, err.message);
      await this.sendErrorToClient(clientId, header.requestId, err.message, 400);
    }
  }

  /**
   * Handle service registration from logic server
   */
  async handleServiceRegister(body, clientId) {
    const { id, host, port, metadata = {} } = body;

    if (!id || !host || !port) {
      throw new Error('Missing required fields: id, host, port');
    }

    // Check if already registered
    if (this.logicServers.has(id)) {
      console.log(`[Gateway] Service ${id} re-registered`);
      const existing = this.logicServers.get(id);
      existing.lastHeartbeat = Date.now();
      existing.metadata = { ...existing.metadata, ...metadata };
      return { success: true, message: 'Service re-registered', id };
    }

    // Create new logic server entry
    const logicServer = new LogicServerInfo(id, host, port, metadata);
    logicServer.clientId = clientId; // Track which client connection registered this service
    this.logicServers.set(id, logicServer);

    console.log(`[Gateway] Service registered: ${id} at ${host}:${port}`);
    
    // Emit event
    this.emit('serviceRegistered', { id, host, port, metadata });

    return { success: true, message: 'Service registered', id };
  }

  /**
   * Handle service unregistration
   */
  async handleServiceUnregister(body) {
    const { id } = body;

    if (!this.logicServers.has(id)) {
      throw new Error(`Service not found: ${id}`);
    }

    const server = this.logicServers.get(id);
    if (server.socket) {
      server.socket.destroy();
    }
    this.logicServers.delete(id);

    console.log(`[Gateway] Service unregistered: ${id}`);
    this.emit('serviceUnregistered', { id });

    return { success: true, message: 'Service unregistered', id };
  }

  /**
   * Handle service heartbeat
   */
  async handleServiceHeartbeat(body) {
    const { id, stats } = body;

    const server = this.logicServers.get(id);
    if (!server) {
      throw new Error(`Service not found: ${id}`);
    }

    server.lastHeartbeat = Date.now();
    if (stats) {
      server.requestCount = stats.requestCount || server.requestCount;
    }

    return { success: true, timestamp: Date.now() };
  }

  /**
   * Handle service discovery
   */
  async handleServiceDiscovery(body) {
    const { service } = body;

    const services = Array.from(this.logicServers.entries())
      .filter(([id, server]) => {
        if (!service) return true; // Return all services
        return server.metadata.services?.includes(service);
      })
      .map(([id, server]) => ({
        id,
        host: server.host,
        port: server.port,
        metadata: server.metadata,
        connected: server.connected,
        load: server.load
      }));

    return { services };
  }

  /**
   * Select logic server based on strategy
   */
  selectLogicServer(route) {
    const availableServers = Array.from(this.logicServers.values())
      .filter(s => s.connected);

    if (availableServers.length === 0) return null;

    // Check if route has specific service requirement
    const serviceName = route.split('.')[0];
    const serviceServers = availableServers.filter(s => 
      !s.metadata.services || s.metadata.services.includes(serviceName)
    );

    const candidates = serviceServers.length > 0 ? serviceServers : availableServers;

    switch (this.strategy) {
      case 'round-robin':
        this.roundRobinIndex = (this.roundRobinIndex + 1) % candidates.length;
        return candidates[this.roundRobinIndex];

      case 'least-connections':
        return candidates.reduce((min, s) => s.load < min.load ? s : min);

      case 'weighted':
        return this.selectWeighted(candidates);

      default:
        return candidates[0];
    }
  }

  /**
   * Weighted random selection
   */
  selectWeighted(servers) {
    const totalWeight = servers.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) return server;
    }
    return servers[0];
  }

  /**
   * Connect to logic server
   */
  connectToLogicServer(logicServer) {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let buffer = Buffer.alloc(0);

      socket.on('connect', () => {
        console.log(`[Gateway] Connected to logic server: ${logicServer.id}`);
        logicServer.connected = true;
        logicServer.socket = socket;
        resolve();
      });

      socket.on('data', async (data) => {
        buffer = Buffer.concat([buffer, data]);

        while (buffer.length >= HEADER_SIZE) {
          try {
            const header = RpcHeader.decode(buffer.slice(0, HEADER_SIZE));
            const messageLength = HEADER_SIZE + header.routeLength + header.bodyLength;

            if (buffer.length < messageLength) break;

            const messageBuffer = buffer.slice(0, messageLength);
            buffer = buffer.slice(messageLength);

            await this.handleLogicServerResponse(logicServer, messageBuffer, header);
          } catch (err) {
            console.error('[Gateway] Logic server parse error:', err.message);
            buffer = Buffer.alloc(0);
            break;
          }
        }
      });

      socket.on('close', () => {
        console.log(`[Gateway] Logic server disconnected: ${logicServer.id}`);
        logicServer.connected = false;
        logicServer.socket = null;
      });

      socket.on('error', (err) => {
        console.error(`[Gateway] Logic server error ${logicServer.id}:`, err.message);
        reject(err);
      });

      socket.connect(logicServer.port, logicServer.host);
    });
  }

  /**
   * Handle response from logic server
   */
  async handleLogicServerResponse(logicServer, messageBuffer, header) {
    // Find pending request
    for (const [key, pending] of this.pendingRequests) {
      if (pending.logicServerId === logicServer.id && pending.requestId === header.requestId) {
        // Forward response to client
        const client = this.clientConnections.get(pending.clientId);
        if (client) {
          client.socket.write(messageBuffer);
        }

        // Cleanup
        logicServer.activeRequests--;
        logicServer.requestCount++;
        this.pendingRequests.delete(key);
        
        // Emit metrics
        const duration = Date.now() - pending.startTime;
        this.emit('requestComplete', {
          requestId: header.requestId,
          logicServerId: logicServer.id,
          duration,
          status: header.status
        });
        return;
      }
    }
  }

  /**
   * Send error response to client
   */
  async sendErrorToClient(clientId, requestId, message, status) {
    const client = this.clientConnections.get(clientId);
    if (!client) return;

    const response = await RpcMessage.createResponse(requestId, { error: message }, status);
    const buffer = await response.encode();
    client.socket.write(buffer);
  }

  /**
   * Register logic server
   */
  registerLogicServer(id, host, port, metadata = {}) {
    const server = new LogicServer(id, host, port, metadata);
    this.logicServers.set(id, server);
    console.log(`[Gateway] Registered logic server: ${id} at ${host}:${port}`);
    return server;
  }

  /**
   * Unregister logic server
   */
  unregisterLogicServer(id) {
    const server = this.logicServers.get(id);
    if (server && server.socket) {
      server.socket.destroy();
    }
    this.logicServers.delete(id);
    console.log(`[Gateway] Unregistered logic server: ${id}`);
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
   * Check health of logic servers
   */
  checkHealth() {
    const now = Date.now();
    for (const [id, server] of this.logicServers) {
      if (now - server.lastHeartbeat > this.heartbeatTimeout) {
        console.warn(`[Gateway] Logic server ${id} heartbeat timeout`);
        if (server.socket) {
          server.socket.destroy();
        }
        server.connected = false;
      }
    }
  }

  /**
   * Cleanup pending requests for disconnected client
   */
  cleanupClientRequests(clientId) {
    for (const [key, pending] of this.pendingRequests) {
      if (pending.clientId === clientId) {
        const server = this.logicServers.get(pending.logicServerId);
        if (server) {
          server.activeRequests--;
        }
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Get gateway statistics
   */
  getStats() {
    return {
      connections: this.clientConnections.size,
      logicServers: Array.from(this.logicServers.values()).map(s => s.toJSON()),
      pendingRequests: this.pendingRequests.size,
      strategy: this.strategy,
      webSocket: this.webSocketHandler ? this.webSocketHandler.getStats() : null
    };
  }

  /**
   * Stop gateway server
   */
  stop() {
    return new Promise((resolve) => {
      clearInterval(this.healthCheckTimer);
      
      // Stop WebSocket server
      if (this.webSocketHandler) {
        this.webSocketHandler.stop();
      }
      
      // Close all logic server connections
      for (const server of this.logicServers.values()) {
        if (server.socket) {
          server.socket.destroy();
        }
      }

      // Close all client connections
      for (const client of this.clientConnections.values()) {
        client.socket.destroy();
      }

      if (this.server) {
        this.server.close(() => {
          console.log('[Gateway] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default GatewayServer;
