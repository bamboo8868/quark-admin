/**
 * Quark RPC - A high-performance RPC protocol
 * Features: Routing, Compression, Serialization
 */

import { RpcServer } from './server.js';
import { RpcClient } from './client.js';
import { RpcRouter } from './router.js';
import { RpcMessage } from './protocol/message.js';
import { RpcHeader, SerializerType, CompressorType, Flags } from './protocol/header.js';
import { Serializer, JsonSerializer, MsgPackSerializer } from './protocol/serializer.js';
import { Compressor, NoneCompressor, GzipCompressor, DeflateCompressor } from './protocol/compressor.js';
import { GatewayServer } from './gateway/gateway.js';
import { LogicServer } from './gateway/logic-server.js';
import { RegistryServer, RegistryClient } from './registry/index.js';

// Re-export
export { 
  RpcServer, RpcClient, RpcRouter, RpcMessage, 
  RpcHeader, SerializerType, CompressorType, Flags, 
  Serializer, JsonSerializer, MsgPackSerializer, 
  Compressor, NoneCompressor, GzipCompressor, DeflateCompressor,
  GatewayServer, LogicServer,
  RegistryServer, RegistryClient
};

// Default export
export default {
  RpcServer,
  RpcClient,
  RpcRouter,
  RpcMessage,
  RpcHeader,
  SerializerType,
  CompressorType,
  Flags,
  Serializer,
  Compressor,
  GatewayServer,
  LogicServer,
  RegistryServer,
  RegistryClient
};
