/**
 * Registry Client
 * Client for connecting to Service Registry
 * Used by Gateway and Logic Servers
 */

import net from 'net';
import RpcMessage from '../protocol/message.js';
import RpcHeader, { HEADER_SIZE } from '../protocol/header.js';
import { EventEmitter } from 'events';

export class RegistryClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.host = options.host || 'localhost';
    this.port = options.port || 8500;
    this.socket = null;
    this.connected = false;
    
    // Service info (for self-registration)
    this.serviceId = options.serviceId;
    this.serviceType = options.serviceType;
    this.serviceHost = options.serviceHost;
    this.servicePort = options.servicePort;
    this.metadata = options.metadata || {};
    
    // Auto-reconnect
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelay = options.reconnectDelay || 5000;
    
    // Heartbeat
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.heartbeatTimer = null;
    
    // Pending requests
    this.pendingRequests = new Map();
    this.requestTimeout = options.requestTimeout || 10000;
  }

  /**
   * Connect to registry
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      this.socket = new net.Socket();
      let buffer = Buffer.alloc(0);

      this.socket.on('connect', async () => {
        console.log(`[RegistryClient] Connected to registry at ${this.host}:${this.port}`);
        this.connected = true;
        
        // Register self if service info provided
        if (this.serviceId) {
          try {
            await this.registerSelf();
            this.startHeartbeat();
          } catch (err) {
            console.error('[RegistryClient] Self-registration failed:', err.message);
          }
        }
        
        this.emit('connected');
        resolve();
      });

      this.socket.on('data', async (data) => {
        buffer = Buffer.concat([buffer, data]);

        while (buffer.length >= HEADER_SIZE) {
          try {
            const header = RpcHeader.decode(buffer.slice(0, HEADER_SIZE));
            const messageLength = HEADER_SIZE + header.routeLength + header.bodyLength;

            if (buffer.length < messageLength) break;

            const messageBuffer = buffer.slice(0, messageLength);
            buffer = buffer.slice(messageLength);

            await this.handleMessage(messageBuffer, header);
          } catch (err) {
            console.error('[RegistryClient] Parse error:', err.message);
            buffer = Buffer.alloc(0);
            break;
          }
        }
      });

      this.socket.on('close', () => {
        console.log('[RegistryClient] Connection closed');
        this.connected = false;
        this.stopHeartbeat();
        this.emit('disconnected');

        // Auto-reconnect
        if (this.autoReconnect) {
          setTimeout(() => {
            this.connect().catch(() => {});
          }, this.reconnectDelay);
        }
      });

      this.socket.on('error', (err) => {
        console.error('[RegistryClient] Socket error:', err.message);
        if (!this.connected) {
          reject(err);
        }
      });

      this.socket.connect(this.port, this.host);
    });
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(messageBuffer, header) {
    const message = new RpcMessage();
    await message.init();
    await message.decode(messageBuffer);

    // Handle notifications (no requestId match)
    if (message.route === 'registry.notify') {
      this.emit('notification', message.body);
      this.emit(message.body.event, message.body);
      return;
    }

    // Handle responses
    const pending = this.pendingRequests.get(header.requestId);
    if (pending) {
      this.pendingRequests.delete(header.requestId);
      clearTimeout(pending.timeout);

      if (header.status !== 0) {
        pending.reject(new Error(message.body.error || `Error ${header.status}`));
      } else {
        pending.resolve(message.body);
      }
    }
  }

  /**
   * Send request to registry
   */
  async request(route, body) {
    if (!this.connected) {
      await this.connect();
    }

    const requestId = RpcMessage.generateRequestId();
    const message = await RpcMessage.createRequest(route, body);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, this.requestTimeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      message.encode().then((buffer) => {
        this.socket.write(buffer);
      }).catch((err) => {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Register self with registry
   */
  async registerSelf() {
    const result = await this.request('registry.register', {
      id: this.serviceId,
      type: this.serviceType,
      host: this.serviceHost,
      port: this.servicePort,
      metadata: this.metadata
    });
    
    console.log(`[RegistryClient] Registered as ${this.serviceId} (${this.serviceType})`);
    return result;
  }

  /**
   * Unregister self
   */
  async unregisterSelf() {
    if (!this.serviceId) return;
    
    return await this.request('registry.unregister', { id: this.serviceId });
  }

  /**
   * Send heartbeat
   */
  async sendHeartbeat() {
    if (!this.connected || !this.serviceId) return;

    try {
      await this.request('registry.heartbeat', {
        id: this.serviceId,
        stats: { requestCount: 0 }
      });
    } catch (err) {
      console.error('[RegistryClient] Heartbeat failed:', err.message);
    }
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
   * Discover services
   */
  async discover(type, tags) {
    return await this.request('registry.discover', { type, tags });
  }

  /**
   * Discover one service (with load balancing)
   */
  async discoverOne(type, strategy) {
    return await this.request('registry.discoverOne', { type, strategy });
  }

  /**
   * List all services
   */
  async list(type, status) {
    return await this.request('registry.list', { type, status });
  }

  /**
   * Watch for service changes
   */
  async watch(type) {
    return await this.request('registry.watch', { type });
  }

  /**
   * Unwatch service changes
   */
  async unwatch(type) {
    return await this.request('registry.unwatch', { type });
  }

  /**
   * Get registry stats
   */
  async stats() {
    return await this.request('registry.stats', {});
  }

  /**
   * Disconnect from registry
   */
  async disconnect() {
    this.autoReconnect = false;
    
    // Unregister before disconnect
    try {
      await this.unregisterSelf();
    } catch (err) {
      // Ignore errors during unregister
    }

    this.stopHeartbeat();

    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
    
    this.connected = false;
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

export default RegistryClient;
