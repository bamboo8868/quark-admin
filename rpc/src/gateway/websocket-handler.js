/**
 * WebSocket Handler for Gateway
 * Handles WebSocket connections from browsers/clients
 * Converts WebSocket messages to RPC protocol
 */

import { WebSocketServer } from 'ws';
import RpcMessage from '../protocol/message.js';
import RpcHeader, { HEADER_SIZE } from '../protocol/header.js';
import { EventEmitter } from 'events';

export class WebSocketHandler extends EventEmitter {
  constructor(gateway, options = {}) {
    super();
    this.gateway = gateway;
    this.port = options.port || 8081;
    this.host = options.host || '0.0.0.0';
    this.path = options.path || '/rpc';
    
    this.wss = null;
    this.connections = new Map(); // ws -> connection info
    this.pendingRequests = new Map(); // requestId -> { ws, resolve, reject }
  }

  /**
   * Start WebSocket server
   */
  start() {
    return new Promise((resolve, reject) => {
      this.wss = new WebSocketServer({
        port: this.port,
        host: this.host,
        path: this.path
      }, () => {
        console.log(`[WebSocket] Server started on ws://${this.host}:${this.port}${this.path}`);
        resolve();
      });

      this.wss.on('connection', (ws, req) => {
        this.handleConnection(ws, req);
      });

      this.wss.on('error', reject);
    });
  }

  /**
   * Handle WebSocket connection
   */
  handleConnection(ws, req) {
    const clientId = `${req.socket.remoteAddress}:${req.socket.remotePort}`;
    console.log(`[WebSocket] Client connected: ${clientId}`);

    const connection = {
      ws,
      clientId,
      connectedAt: Date.now(),
      requestCount: 0
    };

    this.connections.set(ws, connection);

    ws.on('message', async (data) => {
      try {
        // Support both text and binary messages
        let messageData;
        if (data instanceof Buffer) {
          // Try to parse as JSON first, then as binary RPC
          try {
            messageData = JSON.parse(data.toString());
          } catch {
            // Binary RPC message
            await this.handleBinaryMessage(ws, data);
            return;
          }
        } else {
          messageData = JSON.parse(data);
        }

        await this.handleJsonMessage(ws, messageData);
      } catch (err) {
        console.error('[WebSocket] Message error:', err.message);
        this.sendError(ws, null, err.message);
      }
    });

    ws.on('close', () => {
      console.log(`[WebSocket] Client disconnected: ${clientId}`);
      this.handleDisconnect(ws);
    });

    ws.on('error', (err) => {
      console.error(`[WebSocket] Client error ${clientId}:`, err.message);
    });

    // Send welcome message
    this.send(ws, {
      type: 'connected',
      message: 'WebSocket RPC Gateway',
      clientId
    });
  }

  /**
   * Handle JSON message (browser-friendly)
   */
  async handleJsonMessage(ws, message) {
    const { route, body, requestId } = message;

    if (!route) {
      this.sendError(ws, requestId, 'Missing route');
      return;
    }

    const conn = this.connections.get(ws);
    if (conn) {
      conn.requestCount++;
    }

    try {
      // Check for gateway internal routes
      if (route.startsWith('gateway.')) {
        const result = await this.handleGatewayRoute(route, body);
        this.send(ws, {
          type: 'response',
          requestId,
          status: 0,
          body: result
        });
        return;
      }

      // Forward to logic server via gateway
      const result = await this.forwardToLogicServer(route, body, requestId);
      
      this.send(ws, {
        type: 'response',
        requestId,
        status: 0,
        body: result
      });

    } catch (err) {
      console.error('[WebSocket] Handler error:', err.message);
      this.sendError(ws, requestId, err.message, 500);
    }
  }

  /**
   * Handle binary RPC message
   */
  async handleBinaryMessage(ws, buffer) {
    if (buffer.length < HEADER_SIZE) {
      this.sendError(ws, null, 'Invalid message');
      return;
    }

    try {
      const header = RpcHeader.decode(buffer.slice(0, HEADER_SIZE));
      const messageLength = HEADER_SIZE + header.routeLength + header.bodyLength;

      if (buffer.length < messageLength) {
        this.sendError(ws, header.requestId, 'Incomplete message');
        return;
      }

      // Forward to gateway's logic server handler
      const message = new RpcMessage();
      await message.init();
      await message.decode(buffer);

      // Use gateway's routing
      const result = await this.forwardToLogicServer(message.route, message.body, header.requestId);
      
      // Send response
      const response = await RpcMessage.createResponse(header.requestId, result, 0);
      const responseBuffer = await response.encode();
      
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(responseBuffer);
      }

    } catch (err) {
      console.error('[WebSocket] Binary message error:', err.message);
      this.sendError(ws, null, err.message);
    }
  }

  /**
   * Forward request to logic server via gateway
   */
  async forwardToLogicServer(route, body, requestId) {
    return new Promise((resolve, reject) => {
      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, 30000);

      // Use gateway to route
      const logicServer = this.gateway.selectLogicServer(route);
      
      if (!logicServer) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(new Error('No available service'));
        return;
      }

      // Create RPC message
      RpcMessage.createRequest(route, body, { requestId }).then(message => {
        return message.encode();
      }).then(buffer => {
        // Connect to logic server if needed
        if (!logicServer.connected) {
          return this.gateway.connectToLogicServer(logicServer).then(() => buffer);
        }
        return buffer;
      }).then(buffer => {
        // Forward request
        logicServer.socket.write(buffer);

        // Handle response
        const originalHandler = this.gateway.handleLogicServerResponse;
        const tempHandler = async (server, msgBuffer, header) => {
          if (header.requestId === requestId) {
            // Restore original handler
            this.gateway.handleLogicServerResponse = originalHandler;
            
            // Decode response
            const response = new RpcMessage();
            await response.init();
            await response.decode(msgBuffer);

            this.pendingRequests.delete(requestId);
            clearTimeout(timeout);
            
            if (header.status !== 0) {
              reject(new Error(response.body.error || `Error ${header.status}`));
            } else {
              resolve(response.body);
            }
          }
        };

        // Temporarily override handler
        this.gateway.handleLogicServerResponse = tempHandler;

      }).catch(err => {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Handle gateway internal routes
   */
  async handleGatewayRoute(route, body) {
    switch (route) {
      case 'gateway.ping':
        return { pong: true, timestamp: Date.now() };
      
      case 'gateway.stats':
        return this.gateway.getStats();
      
      case 'gateway.services':
        return {
          services: Array.from(this.gateway.logicServers.values()).map(s => s.toJSON())
        };
      
      default:
        throw new Error(`Unknown gateway route: ${route}`);
    }
  }

  /**
   * Handle WebSocket disconnect
   */
  handleDisconnect(ws) {
    const conn = this.connections.get(ws);
    if (conn) {
      // Clean up pending requests
      for (const [requestId, pending] of this.pendingRequests) {
        pending.reject(new Error('Connection closed'));
      }
      this.pendingRequests.clear();

      this.connections.delete(ws);
    }
  }

  /**
   * Send JSON message to WebSocket client
   */
  send(ws, data) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(data));
    }
  }

  /**
   * Send error response
   */
  sendError(ws, requestId, message, status = 400) {
    this.send(ws, {
      type: 'error',
      requestId,
      status,
      error: message
    });
  }

  /**
   * Broadcast message to all WebSocket clients
   */
  broadcast(data) {
    const message = JSON.stringify(data);
    for (const [ws, conn] of this.connections) {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    }
  }

  /**
   * Get WebSocket stats
   */
  getStats() {
    return {
      connections: this.connections.size,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Stop WebSocket server
   */
  stop() {
    return new Promise((resolve) => {
      // Close all connections
      for (const [ws, conn] of this.connections) {
        ws.close();
      }
      this.connections.clear();

      if (this.wss) {
        this.wss.close(() => {
          console.log('[WebSocket] Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

export default WebSocketHandler;
