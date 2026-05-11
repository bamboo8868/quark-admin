/**
 * RPC Serializer
 * Supports JSON, MessagePack serialization
 */

import { SerializerType } from './header.js';

export class JsonSerializer {
  encode(data) {
    return Buffer.from(JSON.stringify(data), 'utf8');
  }

  decode(buffer) {
    return JSON.parse(buffer.toString('utf8'));
  }
}

export class MsgPackSerializer {
  constructor() {
    // Dynamic import for msgpack-lite
    this.msgpack = null;
  }

  async init() {
    if (!this.msgpack) {
      const module = await import('msgpack-lite');
      this.msgpack = module.default || module;
    }
  }

  encode(data) {
    if (!this.msgpack) {
      throw new Error('MsgPack not initialized. Call init() first.');
    }
    return this.msgpack.encode(data);
  }

  decode(buffer) {
    if (!this.msgpack) {
      throw new Error('MsgPack not initialized. Call init() first.');
    }
    return this.msgpack.decode(buffer);
  }
}

export class Serializer {
  constructor() {
    this.serializers = new Map();
    this.serializers.set(SerializerType.JSON, new JsonSerializer());
    this.serializers.set(SerializerType.MSGPACK, new MsgPackSerializer());
  }

  /**
   * Initialize serializers (required for MsgPack)
   */
  async init() {
    const msgpackSerializer = this.serializers.get(SerializerType.MSGPACK);
    if (msgpackSerializer) {
      await msgpackSerializer.init();
    }
  }

  /**
   * Serialize data
   */
  serialize(data, type = SerializerType.JSON) {
    const serializer = this.serializers.get(type);
    if (!serializer) {
      throw new Error(`Unknown serializer type: ${type}`);
    }
    return serializer.encode(data);
  }

  /**
   * Deserialize data
   */
  deserialize(buffer, type = SerializerType.JSON) {
    const serializer = this.serializers.get(type);
    if (!serializer) {
      throw new Error(`Unknown serializer type: ${type}`);
    }
    return serializer.decode(buffer);
  }

  /**
   * Get serializer name
   */
  static getSerializerName(type) {
    switch (type) {
      case SerializerType.JSON:
        return 'JSON';
      case SerializerType.MSGPACK:
        return 'MessagePack';
      case SerializerType.PROTOBUF:
        return 'Protobuf';
      default:
        return 'Unknown';
    }
  }
}

export default Serializer;
