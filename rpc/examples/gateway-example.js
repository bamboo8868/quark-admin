/**
 * Gateway + Logic Server Example
 * Demonstrates distributed RPC architecture
 */

import { GatewayServer } from '../src/gateway/gateway.js';
import { LogicServer } from '../src/gateway/logic-server.js';
import { RpcClient } from '../src/client.js';

async function main() {
  console.log('=== Gateway + Logic Server Example ===\n');

  // 1. Start Gateway
  const gateway = new GatewayServer({
    port: 8080,
    strategy: 'least-connections'
  });
  await gateway.start();

  // Listen for metrics
  gateway.on('requestComplete', (metrics) => {
    console.log(`[Gateway] Request completed in ${metrics.duration}ms`);
  });

  // 2. Start Logic Server 1 (User Service)
  const userService = new LogicServer({
    id: 'user-service-1',
    port: 9001,
    gatewayPort: 8080,
    services: ['user'],
    metadata: { weight: 2, region: 'us-east' }
  });

  userService.register('user.get', async (body) => {
    return { id: body.id, name: 'John Doe', service: 'user-service-1' };
  });

  userService.register('user.create', async (body) => {
    return { id: Date.now(), ...body, service: 'user-service-1' };
  });

  await userService.start();

  // 3. Start Logic Server 2 (Order Service)
  const orderService = new LogicServer({
    id: 'order-service-1',
    port: 9002,
    gatewayPort: 8080,
    services: ['order'],
    metadata: { weight: 1, region: 'us-west' }
  });

  orderService.register('order.get', async (body) => {
    return { orderId: body.id, items: ['item1', 'item2'], service: 'order-service-1' };
  });

  orderService.register('order.create', async (body) => {
    return { orderId: Date.now(), ...body, service: 'order-service-1' };
  });

  await orderService.start();

  // Register logic servers with gateway
  gateway.registerLogicServer('user-service-1', 'localhost', 9001, {
    weight: 2,
    services: ['user']
  });

  gateway.registerLogicServer('order-service-1', 'localhost', 9002, {
    weight: 1,
    services: ['order']
  });

  console.log('\n=== Services Started ===');
  console.log('Gateway: localhost:8080');
  console.log('User Service: localhost:9001');
  console.log('Order Service: localhost:9002\n');

  // 4. Create client and test
  const client = new RpcClient({
    host: 'localhost',
    port: 8080
  });

  try {
    // Test user service
    console.log('--- Testing User Service ---');
    const user = await client.call('user.get', { id: 123 });
    console.log('user.get:', user);

    const newUser = await client.call('user.create', { name: 'Jane' });
    console.log('user.create:', newUser);

    // Test order service
    console.log('\n--- Testing Order Service ---');
    const order = await client.call('order.get', { id: 456 });
    console.log('order.get:', order);

    const newOrder = await client.call('order.create', { items: ['a', 'b'] });
    console.log('order.create:', newOrder);

    // Print gateway stats
    console.log('\n--- Gateway Stats ---');
    console.log(JSON.stringify(gateway.getStats(), null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }

  // Cleanup
  setTimeout(async () => {
    await client.disconnect();
    await userService.stop();
    await orderService.stop();
    await gateway.stop();
    console.log('\nExample completed');
    process.exit(0);
  }, 1000);
}

main().catch(console.error);
