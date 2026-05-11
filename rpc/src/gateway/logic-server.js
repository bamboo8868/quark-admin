/**
 * RPC Logic Server
 * Handles business logic, connects to gateway
 */

import net from 'net';
import RpcMessage from '../protocol/message.js';
import RpcHeader, { HEADER_SIZE } from '../protocol/header.js';
import RpcRouter from '../router.js';
import { EventEmitter } from 'events';

export class LogicServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.id = options.id || `logic-${Date.now()}`;
    this.port = options.port || 0; // 0 = random port
    this.host = options.host || '0.0.0.0';
    this.server = null;
    
    // Gateway connection
    this.gatewayHost = options.gatewayHost || 'localhost';
    this.gatewayPort = options.gatewayPort || 8080;
    this.gatewaySocket = null;
    
    // Router for handling requests
    this.router = new RpcRouter();
    
    // Server metadata
    this.metadata = {
      weight: options.weight || 1,
      services: options.services || [],
      maxConnections: options.maxConnections || 1000,
      ...options.metadata
    };
    
    // Stats
    this.stats = {
      requestCount: 0,
      errorCount: 0,
      startTime: Date.now()
    };
    
    // Health check
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.heartbeatTimer = null;
  }

  /**
   * Start logic server
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer(this.handleConnection.bind(this));
      
      this.server.on('error', reject);
      
      this.server.listen(this.port, this.host, async () => {
        const address = this.server.address();
        this.port = address.port;
        console.log(`[LogicServer:${this.id}] Started on ${this.host}:${this.port}`);
        
        // Connect to gateway
        try {
          await this.connectToGateway();
          resolve();
        } catch (err) {
          console.error(`[LogicServer:${this.id}] Failed to connect to gateway:`, err.message);
          reject(err);
        }
      });
    });
  }

  /**
   * Connect to gateway
   */
  connectToGateway() {
    return new Promise((resolve, reject) => {
      this.gatewaySocket = new net.Socket();
      let buffer = Buffer.alloc(0);

      this.gatewaySocket.on('connect', () => {
        console.log(`[LogicServer:${this.id}] Connected to gateway`);
        this.registerWithGateway();
        this.startHeartbeat();
        resolve();
      });

      this.gatewaySocket.on('data', async (data) => {
        buffer = Buffer.concat([buffer, data]);

        while (buffer.length >= HEADER_SIZE) {
          try {
            const header = RpcHeader.decode(buffer.slice(0, HEADER_SIZE));
            const messageLength = HEADER_SIZE + header.routeLength + header.bodyLength;

            if (buffer.length < messageLength) break;

            const messageBuffer = buffer.slice(0, messageLength);
            buffer = buffer.slice(messageLength);

            await this.handleGatewayRequest(messageBuffer, header);
          } catch (err) {
            console.error(`[LogicServer:${this.id}] Parse error:`, err.message);
            buffer = Buffer.alloc(0);
            break;
          }
        }
      });

      this.gatewaySocket.on('close', () => {
        console.log(`[LogicServer:${this.id}] Gateway connection closed`);
        this.stopHeartbeat();
        
        // Attempt to reconnect
        setTimeout(() => {
          this.connectToGateway().catch(() => {});
        }, 5000);
      });

      this.gatewaySocket.on('error', (err) => {
        console.error(`[LogicServer:${this.id}] Gateway error:`, err.message);
        reject(err);
      });

      this.gatewaySocket.connect(this.gatewayPort, this.gatewayHost);
    });
  }

  /**
   * Register with gateway
   */
  async registerWithGateway() {
    const registration = {
      type: 'register',
      id: this.id,
      host: this.host,
      port: this.port,
      metadata: this.metadata
    };

    // Use internal route for registration
    const message = await RpcMessage.createRequest('gateway.register', registration);
    const buffer = await message.encode();
    this.gatewaySocket.write(buffer);
  }

  /**
   * Send heartbeat to gateway
   */
  async sendHeartbeat() {
    if (!this.gatewaySocket || this.gatewaySocket.destroyed) return;

    const heartbeat = {
      id: this.id,
      timestamp: Date.now(),
      stats: this.getStats()
    };

    const message = await RpcMessage.createRequest('gateway.heartbeat', heartbeat);
    const buffer = await message.encode();
    this.gatewaySocket.write(buffer);
  }

  /**
   * Start heartbeat timer
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.heartbeatInterval);
  }

  /**
   * Stop heartbeat timer
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Handle request from gateway
   */
  async handleGatewayRequest(messageBuffer, header) {
    const message = new RpcMessage();
    await message.init();
    await message.decode(messageBuffer);

    console.log(`[LogicServer:${this.id}] Request: ${message.route}`);

    const startTime = Date.now();

    try {
      // Route to handler
      const result = await this.router.route(message.route, message.body, {
        requestId: header.requestId,
        route: message.route
      });

      // Send response
      const response = await RpcMessage.createResponse(header.requestId, result, 0, {
        serializer: header.serializer,
        compressor: header.compressor
      });

      const responseBuffer = await response.encode();
      this.gatewaySocket.write(responseBuffer);

      // Update stats
      this.stats.requestCount++;
      
      this.emit('requestComplete', {
        route: message.route,
        duration: Date.now() - startTime,
        success: true
      });

    } catch (err) {
      console.error(`[LogicServer:${this.id}] Handler error:`, err.message);
      this.stats.errorCount++;

      // Send error response
      const response = await RpcMessage.createResponse(
        header.requestId,
        { error: err.message },
        500,
        { serializer: header.serializer, compressor: header.compressor }
      );

      const responseBuffer = await response.encode();
      this.gatewaySocket.write(responseBuffer);

      this.emit('requestComplete', {
        route: message.route,
        duration: Date.now() - startTime,
        success: false,
        error: err.message
      });
    }
  }

  /**
   * Handle direct client connections (for testing without gateway)
   */
  handleConnection(socket) {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[LogicServer:${this.id}] Client connected: ${clientId}`);

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

          await this.handleDirectRequest(socket, messageBuffer, header);
        } catch (err) {
          console.error(`[LogicServer:${this.id}] Parse error:`, err.message);
          buffer = Buffer.alloc(0);
          break;
        }
      }
    });

    socket.on('close', () => {
      console.log(`[LogicServer:${this.id}] Client disconnected: ${clientId}`);
    });

    socket.on('error', (err) => {
      console.error(`[LogicServer:${this.id}] Client error ${clientId}:`, err.message);
    });
  }

  /**
   * Handle direct client request
   */
  async handleDirectRequest(socket, messageBuffer, header) {
    const message = new RpcMessage();
    await message.init();
    await message.decode(messageBuffer);

    try {
      const result = await this.router.route(message.route, message.body, {
        requestId: header.requestId
      });

      const response = await RpcMessage.createResponse(header.requestId, result, 0);
      const responseBuffer = await response.encode();
      socket.write(responseBuffer);

      this.stats.requestCount++;
    } catch (err) {
      const response = await RpcMessage.createResponse(
        header.requestId,
        { error: err.message },
        500
      );
      const responseBuffer = await response.encode();
      socket.write(responseBuffer);

      this.stats.errorCount++;
    }
  }

  /**
   * Register route handler
   */
  register(route, handler) {
    this.router.register(route, handler);
  }

  /**
   * Register multiple routes
   */
  registerAll(routes) {
    this.router.registerAll(routes);
  }

  /**
   * Add middleware
   */
  use(middleware) {
    this.router.use(middleware);
  }

  /**
   * Get server statistics
   */
  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      routes: this.router.getRoutes()
    };
  }

  /**
   * Stop logic server
   */
  stop() {
    return new Promise((resolve) => {
      this.stopHeartbeat();

      if (this.gatewaySocket) {
        this.gatewaySocket.destroy();
      }

      if (this.server) {
        this.server.close(() => {
          console.log(`[LogicServer:${this.id}] Stopped`);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default LogicServer;
