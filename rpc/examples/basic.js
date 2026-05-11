/**
 * Basic RPC Example
 * Demonstrates server and client communication
 */

import { RpcServer, RpcClient, SerializerType, CompressorType } from '../src/index.js';

async function main() {
  // Create and start server
  const server = new RpcServer({ port: 8080 });

  // Register routes
  server.register('user.get', async (body) => {
    return { id: body.id, name: 'John Doe', email: 'john@example.com' };
  });

  server.register('user.create', async (body) => {
    return { id: Date.now(), ...body, created: new Date().toISOString() };
  });

  server.register('math.add', async (body) => {
    return { result: body.a + body.b };
  });

  // Add logging middleware
  server.use(async (ctx) => {
    console.log(`[Middleware] ${ctx.route}:`, ctx.body);
    return ctx;
  });

  await server.start();

  // Create client
  const client = new RpcClient({
    host: 'localhost',
    port: 8080,
    serializer: SerializerType.JSON,
    compressor: CompressorType.GZIP
  });

  try {
    // Test calls
    console.log('\n--- Test 1: Get User ---');
    const user = await client.call('user.get', { id: 123 });
    console.log('Response:', user);

    console.log('\n--- Test 2: Create User ---');
    const newUser = await client.call('user.create', {
      name: 'Jane Doe',
      email: 'jane@example.com'
    });
    console.log('Response:', newUser);

    console.log('\n--- Test 3: Math Add ---');
    const sum = await client.call('math.add', { a: 10, b: 20 });
    console.log('Response:', sum);

    console.log('\n--- Test 4: One-way Notification ---');
    await client.notify('log.event', { level: 'info', message: 'Test notification' });
    console.log('Notification sent');

  } catch (err) {
    console.error('Error:', err.message);
  }

  // Cleanup
  setTimeout(async () => {
    await client.disconnect();
    await server.stop();
    console.log('\nExample completed');
    process.exit(0);
  }, 1000);
}

main().catch(console.error);
