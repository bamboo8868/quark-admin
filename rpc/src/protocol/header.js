/**
 * RPC Protocol Header
 * 
 * Header Structure (24 bytes fixed + variable length):
 * - magic (4 bytes): 0x52504321 ("RPC!")
 * - version (1 byte): Protocol version
 * - flags (1 byte): Compression, encryption flags
 * - serializer (1 byte): 0=JSON, 1=MsgPack, 2=Protobuf
 * - compressor (1 byte): 0=None, 1=Gzip, 2=Deflate, 3=Snappy
 * - status (2 bytes): Response status code
 * - requestId (4 bytes): Unique request ID
 * - routeLength (2 bytes): Route string length
 * - bodyLength (4 bytes): Body length after compression
 * - uncompressedLength (4 bytes): Original body length
 */

export const MAGIC = 0x52504321;
export const HEADER_SIZE = 24;

export const SerializerType = {
  JSON: 0,
  MSGPACK: 1,
  PROTOBUF: 2
};

export const CompressorType = {
  NONE: 0,
  GZIP: 1,
  DEFLATE: 2,
  SNAPPY: 3
};

export const Flags = {
  COMPRESSED: 0x01,
  ENCRYPTED: 0x02,
  ONEWAY: 0x04
};

export class RpcHeader {
  constructor(options = {}) {
    this.magic = MAGIC;
    this.version = options.version || 1;
    this.flags = options.flags || 0;
    this.serializer = options.serializer || SerializerType.JSON;
    this.compressor = options.compressor || CompressorType.NONE;
    this.status = options.status || 0;
    this.requestId = options.requestId || 0;
    this.routeLength = options.routeLength || 0;
    this.bodyLength = options.bodyLength || 0;
    this.uncompressedLength = options.uncompressedLength || 0;
  }

  /**
   * Encode header to Buffer
   */
  encode() {
    const buffer = Buffer.alloc(HEADER_SIZE);
    let offset = 0;

    buffer.writeUInt32BE(this.magic, offset);
    offset += 4;
    buffer.writeUInt8(this.version, offset++);
    buffer.writeUInt8(this.flags, offset++);
    buffer.writeUInt8(this.serializer, offset++);
    buffer.writeUInt8(this.compressor, offset++);
    buffer.writeUInt16BE(this.status, offset);
    offset += 2;
    buffer.writeUInt32BE(this.requestId, offset);
    offset += 4;
    buffer.writeUInt16BE(this.routeLength, offset);
    offset += 2;
    buffer.writeUInt32BE(this.bodyLength, offset);
    offset += 4;
    buffer.writeUInt32BE(this.uncompressedLength, offset);

    return buffer;
  }

  /**
   * Decode header from Buffer
   */
  static decode(buffer) {
    if (buffer.length < HEADER_SIZE) {
      throw new Error('Buffer too small for header');
    }

    let offset = 0;
    const header = new RpcHeader();

    header.magic = buffer.readUInt32BE(offset);
    offset += 4;
    
    if (header.magic !== MAGIC) {
      throw new Error(`Invalid magic number: ${header.magic.toString(16)}`);
    }

    header.version = buffer.readUInt8(offset++);
    header.flags = buffer.readUInt8(offset++);
    header.serializer = buffer.readUInt8(offset++);
    header.compressor = buffer.readUInt8(offset++);
    header.status = buffer.readUInt16BE(offset);
    offset += 2;
    header.requestId = buffer.readUInt32BE(offset);
    offset += 4;
    header.routeLength = buffer.readUInt16BE(offset);
    offset += 2;
    header.bodyLength = buffer.readUInt32BE(offset);
    offset += 4;
    header.uncompressedLength = buffer.readUInt32BE(offset);

    return header;
  }

  /**
   * Check if message is compressed
   */
  isCompressed() {
    return (this.flags & Flags.COMPRESSED) !== 0;
  }

  /**
   * Check if message is encrypted
   */
  isEncrypted() {
    return (this.flags & Flags.ENCRYPTED) !== 0;
  }

  /**
   * Check if message is one-way (no response)
   */
  isOneway() {
    return (this.flags & Flags.ONEWAY) !== 0;
  }

  /**
   * Set compression flag
   */
  setCompressed(compressed = true) {
    if (compressed) {
      this.flags |= Flags.COMPRESSED;
    } else {
      this.flags &= ~Flags.COMPRESSED;
    }
  }

  toJSON() {
    return {
      magic: this.magic.toString(16),
      version: this.version,
      flags: this.flags,
      serializer: this.serializer,
      compressor: this.compressor,
      status: this.status,
      requestId: this.requestId,
      routeLength: this.routeLength,
      bodyLength: this.bodyLength,
      uncompressedLength: this.uncompressedLength
    };
  }
}

export default RpcHeader;
