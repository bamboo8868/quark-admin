/**
 * RPC Server
 * TCP server for handling RPC requests
 */

import net from 'net';
import RpcMessage from './protocol/message.js';
import RpcHeader, { HEADER_SIZE, CompressorType } from './protocol/header.js';
import RpcRouter from './router.js';

export class RpcServer {
  constructor(options = {}) {
    this.port = options.port || 8080;
    this.host = options.host || '0.0.0.0';
    this.router = new RpcRouter();
    this.server = null;
    this.connections = new Set();
    this.compressionThreshold = options.compressionThreshold || 1024;
  }

  /**
   * Start RPC server
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = net.createServer(this.handleConnection.bind(this));

      this.server.on('error', (err) => {
        console.error('[Server] Error:', err);
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        console.log(`[Server] RPC Server started on ${this.host}:${this.port}`);
        resolve();
      });
    });
  }

  /**
   * Handle new connection
   */
  handleConnection(socket) {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[Server] Client connected: ${clientId}`);
    this.connections.add(socket);

    let buffer = Buffer.alloc(0);

    socket.on('data', async (data) => {
      buffer = Buffer.concat([buffer, data]);

      // Try to parse complete messages
      while (buffer.length >= HEADER_SIZE) {
        try {
          // Peek header to get message length
          const header = RpcHeader.decode(buffer.slice(0, HEADER_SIZE));
          const messageLength = HEADER_SIZE + header.routeLength + header.bodyLength;

          if (buffer.length < messageLength) {
            break; // Wait for more data
          }

          // Extract complete message
          const messageBuffer = buffer.slice(0, messageLength);
          buffer = buffer.slice(messageLength);

          // Process message
          await this.handleMessage(socket, messageBuffer);
        } catch (err) {
          console.error('[Server] Parse error:', err.message);
          buffer = Buffer.alloc(0); // Reset buffer on error
          break;
        }
      }
    });

    socket.on('close', () => {
      console.log(`[Server] Client disconnected: ${clientId}`);
      this.connections.delete(socket);
    });

    socket.on('error', (err) => {
      console.error(`[Server] Socket error for ${clientId}:`, err.message);
    });
  }

  /**
   * Handle RPC message
   */
  async handleMessage(socket, buffer) {
    const requestMessage = new RpcMessage();
    await requestMessage.init();
    await requestMessage.decode(buffer);

    console.log(`[Server] Request: ${requestMessage.route} (ID: ${requestMessage.header.requestId})`);

    try {
      // Route to handler
      const result = await this.router.route(
        requestMessage.route,
        requestMessage.body,
        { socket, requestId: requestMessage.header.requestId }
      );

      // Send response
      if (!requestMessage.header.isOneway()) {
        await this.sendResponse(socket, requestMessage.header.requestId, result, 0);
      }
    } catch (err) {
      console.error(`[Server] Handler error:`, err.message);
      await this.sendResponse(socket, requestMessage.header.requestId, { error: err.message }, 500);
    }
  }

  /**
   * Send response to client
   */
  async sendResponse(socket, requestId, body, status) {
    const responseMessage = await RpcMessage.createResponse(requestId, body, status);
    
    // Auto-compress if body is large
    const bodyBuffer = Buffer.from(JSON.stringify(body));
    if (bodyBuffer.length > this.compressionThreshold) {
      responseMessage.header.compressor = CompressorType.GZIP;
    }

    const responseBuffer = await responseMessage.encode();
    socket.write(responseBuffer);
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
   * Stop server
   */
  stop() {
    return new Promise((resolve) => {
      // Close all connections
      for (const socket of this.connections) {
        socket.destroy();
      }
      this.connections.clear();

      if (this.server) {
        this.server.close(() => {
          console.log('[Server] RPC Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(route, body) {
    const promises = [];
    for (const socket of this.connections) {
      promises.push(this.sendNotification(socket, route, body));
    }
    return Promise.all(promises);
  }

  /**
   * Send notification to specific client
   */
  async sendNotification(socket, route, body) {
    const message = await RpcMessage.createRequest(route, body);
    message.header.flags |= 0x04; // Set oneway flag
    const buffer = await message.encode();
    socket.write(buffer);
  }
}

export default RpcServer;
