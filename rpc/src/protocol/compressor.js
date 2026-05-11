/**
 * RPC Compressor
 * Supports Gzip, Deflate, Snappy compression algorithms
 */

import zlib from 'zlib';
import { promisify } from 'util';
import { CompressorType } from './header.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

export class NoneCompressor {
  async compress(buffer) {
    return buffer;
  }

  async decompress(buffer) {
    return buffer;
  }
}

export class GzipCompressor {
  async compress(buffer) {
    return gzip(buffer, { level: zlib.constants.Z_BEST_SPEED });
  }

  async decompress(buffer) {
    return gunzip(buffer);
  }
}

export class DeflateCompressor {
  async compress(buffer) {
    return deflate(buffer, { level: zlib.constants.Z_BEST_SPEED });
  }

  async decompress(buffer) {
    return inflate(buffer);
  }
}

export class BrotliCompressor {
  async compress(buffer) {
    return brotliCompress(buffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4
      }
    });
  }

  async decompress(buffer) {
    return brotliDecompress(buffer);
  }
}

export class Compressor {
  constructor() {
    this.compressors = new Map();
    this.compressors.set(CompressorType.NONE, new NoneCompressor());
    this.compressors.set(CompressorType.GZIP, new GzipCompressor());
    this.compressors.set(CompressorType.DEFLATE, new DeflateCompressor());
  }

  /**
   * Compress buffer
   */
  async compress(buffer, type = CompressorType.NONE) {
    const compressor = this.compressors.get(type);
    if (!compressor) {
      throw new Error(`Unknown compressor type: ${type}`);
    }
    return compressor.compress(buffer);
  }

  /**
   * Decompress buffer
   */
  async decompress(buffer, type = CompressorType.NONE) {
    const compressor = this.compressors.get(type);
    if (!compressor) {
      throw new Error(`Unknown compressor type: ${type}`);
    }
    return compressor.decompress(buffer);
  }

  /**
   * Get compressor name
   */
  static getCompressorName(type) {
    switch (type) {
      case CompressorType.NONE:
        return 'None';
      case CompressorType.GZIP:
        return 'Gzip';
      case CompressorType.DEFLATE:
        return 'Deflate';
      case CompressorType.SNAPPY:
        return 'Snappy';
      default:
        return 'Unknown';
    }
  }

  /**
   * Select best compressor based on data size
   */
  static selectCompressor(dataSize) {
    if (dataSize < 1024) {
      return CompressorType.NONE; // Small data, no compression
    } else if (dataSize < 10240) {
      return CompressorType.DEFLATE; // Medium data, fast compression
    } else {
      return CompressorType.GZIP; // Large data, better compression
    }
  }

  /**
   * Calculate compression ratio
   */
  static getCompressionRatio(original, compressed) {
    if (original === 0) return 0;
    return ((original - compressed) / original * 100).toFixed(2);
  }
}

export default Compressor;
