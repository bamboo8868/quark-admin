/**
 * WebSocket Gateway Example
 * Demonstrates browser clients connecting via WebSocket to Gateway
 */

import { GatewayServer } from '../src/gateway/gateway.js';
import { LogicServer } from '../src/gateway/logic-server.js';
import WebSocket from 'ws';

async function main() {
  console.log('=== WebSocket Gateway Example ===\n');

  // 1. Start Gateway with WebSocket support
  const gateway = new GatewayServer({
    port: 8080,           // TCP port for RPC clients
    webSocketPort: 8081,  // WebSocket port for browser clients
    enableWebSocket: true,
    strategy: 'least-connections'
  });

  await gateway.start();
  console.log('');

  // 2. Start Logic Server (auto-registers with gateway)
  const logicServer = new LogicServer({
    id: 'user-service-1',
    port: 9001,
    gatewayHost: 'localhost',
    gatewayPort: 8080,
    services: ['user'],
    metadata: { weight: 2 }
  });

  logicServer.register('user.get', async (body) => {
    return { 
      id: body.id, 
      name: 'John Doe', 
      email: 'john@example.com',
      server: 'user-service-1',
      timestamp: Date.now()
    };
  });

  logicServer.register('user.create', async (body) => {
    return { 
      id: Date.now(), 
      ...body, 
      status: 'created',
      server: 'user-service-1'
    };
  });

  logicServer.register('chat.send', async (body) => {
    return {
      messageId: Date.now(),
      content: body.content,
      sender: body.sender,
      timestamp: Date.now()
    };
  });

  await logicServer.start();
  console.log('');

  // Wait for registration
  await new Promise(resolve => setTimeout(resolve, 500));

  // 3. Simulate WebSocket browser clients
  console.log('3. Simulating WebSocket Browser Clients...\n');

  // Client 1: Connect via WebSocket
  const wsClient1 = new WebSocket('ws://localhost:8081/rpc');
  
  wsClient1.on('open', () => {
    console.log('[Browser 1] Connected via WebSocket');
    
    // Send JSON-RPC style request
    wsClient1.send(JSON.stringify({
      route: 'user.get',
      body: { id: 123 },
      requestId: 'req-1'
    }));
  });

  wsClient1.on('message', (data) => {
    const response = JSON.parse(data.toString());
    console.log('[Browser 1] Response:', JSON.stringify(response, null, 2));
  });

  // Client 2: Another browser client
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const wsClient2 = new WebSocket('ws://localhost:8081/rpc');
  
  wsClient2.on('open', () => {
    console.log('[Browser 2] Connected via WebSocket');
    
    wsClient2.send(JSON.stringify({
      route: 'user.create',
      body: { name: 'Jane Doe', email: 'jane@example.com' },
      requestId: 'req-2'
    }));
    
    // Test chat
    setTimeout(() => {
      wsClient2.send(JSON.stringify({
        route: 'chat.send',
        body: { content: 'Hello from browser!', sender: 'user-2' },
        requestId: 'req-3'
      }));
    }, 100);
  });

  wsClient2.on('message', (data) => {
    const response = JSON.parse(data.toString());
    console.log('[Browser 2] Response:', JSON.stringify(response, null, 2));
  });

  // Client 3: Test gateway internal routes
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const wsClient3 = new WebSocket('ws://localhost:8081/rpc');
  
  wsClient3.on('open', () => {
    console.log('[Browser 3] Connected via WebSocket');
    
    // Get gateway stats
    wsClient3.send(JSON.stringify({
      route: 'gateway.stats',
      body: {},
      requestId: 'req-4'
    }));
    
    // Get services list
    setTimeout(() => {
      wsClient3.send(JSON.stringify({
        route: 'gateway.services',
        body: {},
        requestId: 'req-5'
      }));
    }, 100);
    
    // Ping test
    setTimeout(() => {
      wsClient3.send(JSON.stringify({
        route: 'gateway.ping',
        body: {},
        requestId: 'req-6'
      }));
    }, 200);
  });

  wsClient3.on('message', (data) => {
    const response = JSON.parse(data.toString());
    console.log('[Browser 3] Response:', JSON.stringify(response, null, 2));
  });

  // Wait for all responses
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Print final stats
  console.log('\n=== Gateway Stats ===');
  const stats = gateway.getStats();
  console.log(`TCP Connections: ${stats.connections}`);
  console.log(`WebSocket Connections: ${stats.webSocket?.connections || 0}`);
  console.log(`Logic Servers: ${stats.logicServers.length}`);
  console.log(`Pending Requests: ${stats.pendingRequests}`);

  // Cleanup
  console.log('\n=== Cleanup ===');
  wsClient1.close();
  wsClient2.close();
  wsClient3.close();
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  await logicServer.stop();
  await gateway.stop();
  
  console.log('Example completed!');
  process.exit(0);
}

main().catch(console.error);
