/**
 * RPC Client
 * TCP client for making RPC requests
 */

import net from 'net';
import RpcMessage from './protocol/message.js';
import RpcHeader, { HEADER_SIZE, SerializerType, CompressorType } from './protocol/header.js';

export class RpcClient {
  constructor(options = {}) {
    this.host = options.host || 'localhost';
    this.port = options.port || 8080;
    this.socket = null;
    this.connected = false;
    this.pendingRequests = new Map();
    this.requestTimeout = options.requestTimeout || 30000;
    this.defaultSerializer = options.serializer || SerializerType.JSON;
    this.defaultCompressor = options.compressor || CompressorType.NONE;
    this.compressionThreshold = options.compressionThreshold || 1024;
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelay = options.reconnectDelay || 3000;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
  }

  /**
   * Connect to RPC server
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected) {
        resolve();
        return;
      }

      this.socket = new net.Socket();
      let buffer = Buffer.alloc(0);

      this.socket.on('connect', () => {
        console.log(`[Client] Connected to ${this.host}:${this.port}`);
        this.connected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('data', async (data) => {
        buffer = Buffer.concat([buffer, data]);

        while (buffer.length >= HEADER_SIZE) {
          try {
            const header = RpcHeader.decode(buffer.slice(0, HEADER_SIZE));
            const messageLength = HEADER_SIZE + header.routeLength + header.bodyLength;

            if (buffer.length < messageLength) {
              break;
            }

            const messageBuffer = buffer.slice(0, messageLength);
            buffer = buffer.slice(messageLength);

            await this.handleResponse(messageBuffer);
          } catch (err) {
            console.error('[Client] Parse error:', err.message);
            buffer = Buffer.alloc(0);
            break;
          }
        }
      });

      this.socket.on('close', () => {
        console.log('[Client] Connection closed');
        this.connected = false;
        this.socket = null;

        // Reject all pending requests
        for (const [requestId, pending] of this.pendingRequests) {
          pending.reject(new Error('Connection closed'));
        }
        this.pendingRequests.clear();

        // Auto-reconnect
        if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[Client] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect().catch(() => {}), this.reconnectDelay);
        }
      });

      this.socket.on('error', (err) => {
        console.error('[Client] Socket error:', err.message);
        if (!this.connected) {
          reject(err);
        }
      });

      this.socket.connect(this.port, this.host);
    });
  }

  /**
   * Handle response from server
   */
  async handleResponse(buffer) {
    const message = new RpcMessage();
    await message.init();
    await message.decode(buffer);

    const requestId = message.header.requestId;
    const pending = this.pendingRequests.get(requestId);

    if (pending) {
      this.pendingRequests.delete(requestId);
      clearTimeout(pending.timeout);

      if (message.header.status !== 0) {
        pending.reject(new Error(message.body.error || `Error ${message.header.status}`));
      } else {
        pending.resolve(message.body);
      }
    }
  }

  /**
   * Make RPC call
   */
  async call(route, body, options = {}) {
    if (!this.connected) {
      await this.connect();
    }

    const requestId = RpcMessage.generateRequestId();
    
    // Determine compression
    const bodyBuffer = Buffer.from(JSON.stringify(body));
    let compressor = options.compressor ?? this.defaultCompressor;
    if (bodyBuffer.length > this.compressionThreshold && compressor === CompressorType.NONE) {
      compressor = CompressorType.GZIP;
    }

    const message = await RpcMessage.createRequest(route, body, {
      requestId,
      serializer: options.serializer ?? this.defaultSerializer,
      compressor
    });

    return new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Request timeout'));
      }, options.timeout ?? this.requestTimeout);

      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Send request
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
   * Send one-way notification (no response expected)
   */
  async notify(route, body, options = {}) {
    if (!this.connected) {
      await this.connect();
    }

    const message = await RpcMessage.createRequest(route, body, {
      requestId: RpcMessage.generateRequestId(),
      serializer: options.serializer ?? this.defaultSerializer,
      compressor: options.compressor ?? this.defaultCompressor
    });

    // Set oneway flag
    message.header.flags |= 0x04;

    const buffer = await message.encode();
    this.socket.write(buffer);
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    return new Promise((resolve) => {
      this.autoReconnect = false;
      
      if (this.socket) {
        this.socket.end(() => {
          this.socket = null;
          this.connected = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected;
  }
}

export default RpcClient;
