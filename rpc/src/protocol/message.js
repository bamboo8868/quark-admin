/**
 * RPC Message
 * Complete message structure with header, route, and body
 */

import RpcHeader, { HEADER_SIZE, SerializerType, CompressorType } from './header.js';
import Serializer from './serializer.js';
import Compressor from './compressor.js';

export class RpcMessage {
  constructor(options = {}) {
    this.header = options.header || new RpcHeader();
    this.route = options.route || '';
    this.body = options.body || null;
    this.serializer = new Serializer();
    this.compressor = new Compressor();
  }

  /**
   * Initialize serializer
   */
  async init() {
    await this.serializer.init();
  }

  /**
   * Encode message to buffer
   */
  async encode() {
    // Serialize body
    let bodyBuffer = this.serializer.serialize(this.body, this.header.serializer);
    const uncompressedLength = bodyBuffer.length;

    // Compress if needed
    if (this.header.compressor !== CompressorType.NONE) {
      bodyBuffer = await this.compressor.compress(bodyBuffer, this.header.compressor);
      this.header.setCompressed(true);
    }

    // Update header
    this.header.routeLength = Buffer.byteLength(this.route, 'utf8');
    this.header.bodyLength = bodyBuffer.length;
    this.header.uncompressedLength = uncompressedLength;

    // Build complete message
    const headerBuffer = this.header.encode();
    const routeBuffer = Buffer.from(this.route, 'utf8');

    return Buffer.concat([headerBuffer, routeBuffer, bodyBuffer]);
  }

  /**
   * Decode message from buffer
   */
  async decode(buffer) {
    if (buffer.length < HEADER_SIZE) {
      throw new Error('Buffer too small');
    }

    // Decode header
    this.header = RpcHeader.decode(buffer);

    // Extract route
    const routeStart = HEADER_SIZE;
    const routeEnd = routeStart + this.header.routeLength;
    this.route = buffer.slice(routeStart, routeEnd).toString('utf8');

    // Extract body
    const bodyStart = routeEnd;
    const bodyEnd = bodyStart + this.header.bodyLength;
    let bodyBuffer = buffer.slice(bodyStart, bodyEnd);

    // Decompress if needed
    if (this.header.isCompressed()) {
      bodyBuffer = await this.compressor.decompress(bodyBuffer, this.header.compressor);
    }

    // Deserialize body
    this.body = this.serializer.deserialize(bodyBuffer, this.header.serializer);

    return this;
  }

  /**
   * Create request message
   */
  static async createRequest(route, body, options = {}) {
    const message = new RpcMessage({
      header: new RpcHeader({
        requestId: options.requestId || RpcMessage.generateRequestId(),
        serializer: options.serializer || SerializerType.JSON,
        compressor: options.compressor || CompressorType.NONE
      }),
      route,
      body
    });
    await message.init();
    return message;
  }

  /**
   * Create response message
   */
  static async createResponse(requestId, body, status = 0, options = {}) {
    const message = new RpcMessage({
      header: new RpcHeader({
        requestId,
        status,
        serializer: options.serializer || SerializerType.JSON,
        compressor: options.compressor || CompressorType.NONE
      }),
      route: '', // Response doesn't need route
      body
    });
    await message.init();
    return message;
  }

  /**
   * Generate unique request ID
   */
  static generateRequestId() {
    return Math.floor(Math.random() * 0xFFFFFFFF);
  }

  /**
   * Get message size
   */
  get size() {
    return HEADER_SIZE + this.header.routeLength + this.header.bodyLength;
  }

  /**
   * Get compression ratio
   */
  get compressionRatio() {
    if (this.header.uncompressedLength === 0) return 0;
    return ((this.header.uncompressedLength - this.header.bodyLength) / this.header.uncompressedLength * 100).toFixed(2);
  }

  toJSON() {
    return {
      header: this.header.toJSON(),
      route: this.route,
      body: this.body,
      size: this.size,
      compressionRatio: this.compressionRatio + '%'
    };
  }
}

export default RpcMessage;
