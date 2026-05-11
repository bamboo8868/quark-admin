/**
 * Service Registry Example
 * Demonstrates standalone registry server with gateway and logic servers
 * 
 * Architecture:
 *   Logic Server -> Registry (register)
 *   Gateway -> Registry (discover)
 *   Client -> Gateway -> Logic Server
 */

import { RegistryServer, RegistryClient } from '../src/registry/index.js';
import { RpcServer } from '../src/server.js';
import { RpcClient } from '../src/client.js';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Service Registry Example ===\n');

  // 1. Start Registry Server (standalone)
  console.log('1. Starting Registry Server...');
  const registry = new RegistryServer({ port: 8500 });
  
  registry.on('serviceRegistered', ({ id, type }) => {
    console.log(`[Registry Event] Service registered: ${id} (${type})`);
  });
  
  registry.on('serviceUnregistered', ({ id, type }) => {
    console.log(`[Registry Event] Service unregistered: ${id} (${type})`);
  });
  
  await registry.start();
  console.log('');

  // 2. Start Logic Server with Registry Client
  console.log('2. Starting Logic Server...');
  const logicServer = new RpcServer({ port: 9001 });
  
  logicServer.register('user.get', async (body) => {
    return { 
      id: body.id, 
      name: 'John Doe', 
      server: 'logic-1',
      timestamp: Date.now()
    };
  });
  
  logicServer.register('user.create', async (body) => {
    return { id: Date.now(), ...body, server: 'logic-1' };
  });
  
  await logicServer.start();
  
  // Connect to registry and register
  const logicRegistryClient = new RegistryClient({
    host: 'localhost',
    port: 8500,
    serviceId: 'logic-server-1',
    serviceType: 'logic',
    serviceHost: 'localhost',
    servicePort: 9001,
    metadata: { 
      services: ['user'], 
      weight: 2,
      region: 'us-east',
      tags: ['v1', 'stable']
    }
  });
  
  await logicRegistryClient.connect();
  console.log('');

  // 3. Start Gateway with Registry Client
  console.log('3. Starting Gateway Server...');
  const gatewayServer = new RpcServer({ port: 8080 });
  
  // Gateway discovers services from registry and routes requests
  const gatewayRegistryClient = new RegistryClient({
    host: 'localhost',
    port: 8500,
    serviceId: 'gateway-1',
    serviceType: 'gateway',
    serviceHost: 'localhost',
    servicePort: 8080,
    metadata: { region: 'us-east' }
  });
  
  // Watch for logic service changes
  gatewayRegistryClient.on('serviceUp', (event) => {
    console.log(`[Gateway] Logic service up: ${event.data.id}`);
  });
  
  gatewayRegistryClient.on('serviceDown', (event) => {
    console.log(`[Gateway] Logic service down: ${event.data.id}`);
  });
  
  await gatewayRegistryClient.connect();
  
  // Discover logic servers
  const discovery = await gatewayRegistryClient.discover('logic');
  console.log(`[Gateway] Discovered ${discovery.count} logic servers:`);
  discovery.services.forEach(s => {
    console.log(`  - ${s.id}: ${s.host}:${s.port}`);
  });
  
  // Setup gateway routing
  const logicServices = discovery.services;
  let currentLogicIndex = 0;
  
  gatewayServer.register('user.get', async (body) => {
    // Simple round-robin to logic servers
    const logic = logicServices[currentLogicIndex % logicServices.length];
    currentLogicIndex++;
    
    // Forward to logic server
    const client = new RpcClient({ host: logic.host, port: logic.port });
    await client.connect();
    const result = await client.call('user.get', body);
    await client.disconnect();
    return result;
  });
  
  gatewayServer.register('user.create', async (body) => {
    const logic = logicServices[currentLogicIndex % logicServices.length];
    currentLogicIndex++;
    
    const client = new RpcClient({ host: logic.host, port: logic.port });
    await client.connect();
    const result = await client.call('user.create', body);
    await client.disconnect();
    return result;
  });
  
  await gatewayServer.start();
  console.log('');

  // 4. Start another Logic Server (to show multiple services)
  console.log('4. Starting Second Logic Server...');
  const logicServer2 = new RpcServer({ port: 9002 });
  
  logicServer2.register('order.get', async (body) => {
    return { 
      orderId: body.id, 
      items: ['item1', 'item2'],
      server: 'logic-2'
    };
  });
  
  await logicServer2.start();
  
  const logicRegistryClient2 = new RegistryClient({
    host: 'localhost',
    port: 8500,
    serviceId: 'logic-server-2',
    serviceType: 'logic',
    serviceHost: 'localhost',
    servicePort: 9002,
    metadata: { 
      services: ['order'], 
      weight: 1,
      region: 'us-west',
      tags: ['v1', 'beta']
    }
  });
  
  await logicRegistryClient2.connect();
  console.log('');

  // Wait for registration
  await sleep(500);

  // 5. Check registry stats
  console.log('5. Registry Stats:');
  const stats = await gatewayRegistryClient.stats();
  console.log(`  Total services: ${stats.totalServices}`);
  console.log(`  Gateways: ${stats.byType.gateway}`);
  console.log(`  Logic servers: ${stats.byType.logic}`);
  console.log('');

  // 6. Client connects through Gateway
  console.log('6. Testing Client -> Gateway -> Logic Server...');
  const client = new RpcClient({ host: 'localhost', port: 8080 });
  
  try {
    const user = await client.call('user.get', { id: 123 });
    console.log('user.get result:', JSON.stringify(user, null, 2));
    
    const newUser = await client.call('user.create', { name: 'Jane' });
    console.log('user.create result:', JSON.stringify(newUser, null, 2));
    
  } catch (err) {
    console.error('Client error:', err.message);
  }
  
  await client.disconnect();
  console.log('');

  // 7. Test service discovery
  console.log('7. Testing Service Discovery:');
  const allServices = await gatewayRegistryClient.list();
  console.log(`  All services: ${allServices.count}`);
  allServices.services.forEach(s => {
    console.log(`    - ${s.id} (${s.type}): ${s.status}`);
  });
  console.log('');

  // Cleanup
  console.log('8. Cleanup...');
  await logicRegistryClient.disconnect();
  await logicRegistryClient2.disconnect();
  await gatewayRegistryClient.disconnect();
  
  await logicServer.stop();
  await logicServer2.stop();
  await gatewayServer.stop();
  await registry.stop();
  
  console.log('\nExample completed!');
  process.exit(0);
}

main().catch(console.error);
