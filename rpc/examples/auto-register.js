/**
 * Auto-Registration Example
 * Logic servers automatically register with gateway
 */

import { GatewayServer } from '../src/gateway/gateway.js';
import { LogicServer } from '../src/gateway/logic-server.js';
import { RpcClient } from '../src/client.js';

async function main() {
  console.log('=== Auto-Registration Example ===\n');

  // 1. Start Gateway (no manual registration needed)
  const gateway = new GatewayServer({
    port: 8080,
    strategy: 'least-connections'
  });

  // Listen for service registration events
  gateway.on('serviceRegistered', ({ id, host, port, metadata }) => {
    console.log(`[Event] Service registered: ${id} at ${host}:${port}`);
  });

  gateway.on('serviceUnregistered', ({ id }) => {
    console.log(`[Event] Service unregistered: ${id}`);
  });

  await gateway.start();

  // 2. Start Logic Server 1 - auto-registers with gateway
  const userService = new LogicServer({
    id: 'user-service-1',
    port: 9001,
    gatewayHost: 'localhost',
    gatewayPort: 8080,
    services: ['user'],
    metadata: { weight: 2, region: 'us-east' }
  });

  userService.register('user.get', async (body) => {
    return { 
      id: body.id, 
      name: 'John Doe', 
      service: 'user-service-1',
      timestamp: Date.now()
    };
  });

  userService.register('user.list', async () => {
    return { 
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ],
      service: 'user-service-1'
    };
  });

  await userService.start();
  console.log('');

  // 3. Start Logic Server 2 - auto-registers with gateway
  const orderService = new LogicServer({
    id: 'order-service-1',
    port: 9002,
    gatewayHost: 'localhost',
    gatewayPort: 8080,
    services: ['order'],
    metadata: { weight: 1, region: 'us-west' }
  });

  orderService.register('order.get', async (body) => {
    return { 
      orderId: body.id, 
      items: ['item1', 'item2'], 
      total: 99.99,
      service: 'order-service-1'
    };
  });

  orderService.register('order.create', async (body) => {
    return { 
      orderId: Date.now(), 
      ...body, 
      status: 'created',
      service: 'order-service-1'
    };
  });

  await orderService.start();
  console.log('');

  // Wait a moment for registration to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  // 4. Check gateway stats
  console.log('--- Gateway Stats ---');
  const stats = gateway.getStats();
  console.log(`Connected clients: ${stats.connections}`);
  console.log(`Registered services: ${stats.logicServers.length}`);
  stats.logicServers.forEach(s => {
    console.log(`  - ${s.id}: ${s.host}:${s.port} (connected: ${s.connected})`);
  });
  console.log('');

  // 5. Create client and test services
  const client = new RpcClient({
    host: 'localhost',
    port: 8080
  });

  try {
    // Test user service
    console.log('--- Testing User Service ---');
    const user = await client.call('user.get', { id: 123 });
    console.log('user.get:', JSON.stringify(user, null, 2));

    const userList = await client.call('user.list', {});
    console.log('user.list:', JSON.stringify(userList, null, 2));

    // Test order service
    console.log('\n--- Testing Order Service ---');
    const order = await client.call('order.get', { id: 456 });
    console.log('order.get:', JSON.stringify(order, null, 2));

    const newOrder = await client.call('order.create', { 
      items: ['product-a', 'product-b'],
      customer: 'Jane Doe'
    });
    console.log('order.create:', JSON.stringify(newOrder, null, 2));

    // Test service discovery
    console.log('\n--- Service Discovery ---');
    const discovery = await client.call('gateway.discover', { service: 'user' });
    console.log('User services:', JSON.stringify(discovery, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }

  // Cleanup
  console.log('\n--- Cleanup ---');
  setTimeout(async () => {
    await client.disconnect();
    await userService.stop();
    await orderService.stop();
    await gateway.stop();
    console.log('Example completed');
    process.exit(0);
  }, 1000);
}

main().catch(console.error);
