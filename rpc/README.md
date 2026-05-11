# Quark RPC

A high-performance RPC protocol implementation with routing, compression, and serialization support.

## Features

- **Protocol Design**: Binary protocol with fixed 24-byte header + variable route + body
- **Routing**: Dot-notation route system with middleware support
- **Compression**: Gzip, Deflate algorithms with auto-selection
- **Serialization**: JSON, MessagePack support
- **Connection Management**: TCP-based with auto-reconnect
- **Request/Response**: Support for both request-response and one-way notifications
- **Gateway Architecture**: Load balancing, service discovery, horizontal scaling

## Architecture

### Single Server Mode
```
Client <-> RpcServer
```

### Gateway Mode (Distributed)
```
                    +-> LogicServer (User Service)
Client <-> Gateway -+-> LogicServer (Order Service)
                    +-> LogicServer (Payment Service)
```

## Protocol Structure

```
+--------+---------+------------+------------+----------+
| Header |  Route  |    Body    |   Total    |
| 24B    | Variable|  Variable  |   Variable |
+--------+---------+------------+------------+----------+
```

### Header Format (24 bytes)

| Field | Size | Description |
|-------|------|-------------|
| magic | 4 bytes | Protocol magic: 0x52504321 |
| version | 1 byte | Protocol version |
| flags | 1 byte | Compression, encryption flags |
| serializer | 1 byte | 0=JSON, 1=MsgPack |
| compressor | 1 byte | 0=None, 1=Gzip, 2=Deflate |
| status | 2 bytes | Response status code |
| requestId | 4 bytes | Unique request ID |
| routeLength | 2 bytes | Route string length |
| bodyLength | 4 bytes | Body length (compressed) |
| uncompressedLength | 4 bytes | Original body length |

## Installation

```bash
cd rpc
npm install
```

## Quick Start

### Single Server

```javascript
import { RpcServer, RpcClient } from './src/index.js';

// Server
const server = new RpcServer({ port: 8080 });
server.register('user.get', async (body) => ({ id: body.id, name: 'John' }));
await server.start();

// Client
const client = new RpcClient({ host: 'localhost', port: 8080 });
const user = await client.call('user.get', { id: 123 });
```

### Gateway + Logic Servers

```javascript
import { GatewayServer, LogicServer, RpcClient } from './src/index.js';

// Gateway
const gateway = new GatewayServer({ port: 8080, strategy: 'least-connections' });
await gateway.start();

// Logic Server
const logic = new LogicServer({
  id: 'user-service',
  port: 9001,
  gatewayPort: 8080,
  services: ['user']
});
logic.register('user.get', async (body) => ({ id: body.id }));
await logic.start();

// Register with gateway
gateway.registerLogicServer('user-service', 'localhost', 9001);

// Client connects to gateway
const client = new RpcClient({ host: 'localhost', port: 8080 });
const user = await client.call('user.get', { id: 123 });
```

## Examples

### Basic Usage
```bash
node examples/basic.js
```

### Gateway + Logic Server
```bash
node examples/gateway-example.js
```

### Load Balancing Test
```bash
node examples/load-balance.js
```

### Compression Benchmark
```bash
node examples/compression.js
```

## API Reference

### RpcServer

| Method | Description |
|--------|-------------|
| `register(route, handler)` | Register a route handler |
| `registerAll(routes)` | Register multiple routes |
| `use(middleware)` | Add middleware |
| `start()` | Start the server |
| `stop()` | Stop the server |
| `broadcast(route, body)` | Broadcast to all clients |

### RpcClient

| Method | Description |
|--------|-------------|
| `connect()` | Connect to server |
| `call(route, body, options)` | Make RPC call |
| `notify(route, body)` | Send one-way notification |
| `disconnect()` | Disconnect from server |
| `isConnected()` | Check connection status |

### GatewayServer

| Method | Description |
|--------|-------------|
| `registerLogicServer(id, host, port, metadata)` | Register a logic server |
| `unregisterLogicServer(id)` | Unregister a logic server |
| `getStats()` | Get gateway statistics |
| `start()` | Start the gateway |
| `stop()` | Stop the gateway |

### LogicServer

| Method | Description |
|--------|-------------|
| `register(route, handler)` | Register a route handler |
| `registerAll(routes)` | Register multiple routes |
| `use(middleware)` | Add middleware |
| `getStats()` | Get server statistics |
| `start()` | Start the logic server |
| `stop()` | Stop the logic server |

### Options

```javascript
// Server options
{
  port: 8080,              // Server port
  host: '0.0.0.0',         // Server host
  compressionThreshold: 1024  // Auto-compress threshold
}

// Client options
{
  host: 'localhost',       // Server host
  port: 8080,              // Server port
  serializer: 0,           // 0=JSON, 1=MsgPack
  compressor: 0,           // 0=None, 1=Gzip, 2=Deflate
  requestTimeout: 30000,   // Request timeout (ms)
  autoReconnect: true,     // Auto reconnect
  reconnectDelay: 3000,    // Reconnect delay (ms)
  maxReconnectAttempts: 5  // Max reconnect attempts
}

// Gateway options
{
  port: 8080,              // Gateway port
  strategy: 'least-connections',  // round-robin, least-connections, weighted
  heartbeatInterval: 30000,       // Health check interval
  heartbeatTimeout: 10000         // Health check timeout
}

// Logic Server options
{
  id: 'service-1',         // Server ID
  port: 9001,              // Server port
  gatewayPort: 8080,       // Gateway port
  services: ['user'],      // Service names
  weight: 1,               // Load balancing weight
  heartbeatInterval: 30000 // Heartbeat interval
}
```

## Load Balancing Strategies

| Strategy | Description |
|----------|-------------|
| `round-robin` | Distribute requests evenly |
| `least-connections` | Route to server with fewest active connections |
| `weighted` | Distribute based on server weight |

## Compression Algorithms

| Algorithm | Type | Best For |
|-----------|------|----------|
| None | 0 | Small data (< 1KB) |
| Gzip | 1 | Large data, best compression |
| Deflate | 2 | Medium data, fast compression |

## Serializers

| Serializer | Type | Description |
|------------|------|-------------|
| JSON | 0 | Human-readable, built-in |
| MessagePack | 1 | Binary, compact |

## License

MIT
