/**
 * Load Balancing Test
 * Demonstrates different load balancing strategies
 */

import { GatewayServer } from '../src/gateway/gateway.js';
import { LogicServer } from '../src/gateway/logic-server.js';
import { RpcClient } from '../src/client.js';

async function createLogicServer(id, port, weight) {
  const server = new LogicServer({
    id,
    port,
    gatewayPort: 8080,
    metadata: { weight }
  });

  server.register('test.echo', async (body) => {
    return { server: id, weight, data: body };
  });

  await server.start();
  return server;
}

async function testStrategy(strategy) {
  console.log(`\n=== Testing Strategy: ${strategy} ===\n`);

  // Create gateway with specific strategy
  const gateway = new GatewayServer({
    port: 8080,
    strategy
  });
  await gateway.start();

  // Create 3 logic servers with different weights
  const servers = [];
  servers.push(await createLogicServer('server-1', 9001, 3));
  servers.push(await createLogicServer('server-2', 9002, 2));
  servers.push(await createLogicServer('server-3', 9003, 1));

  // Register with gateway
  gateway.registerLogicServer('server-1', 'localhost', 9001, { weight: 3 });
  gateway.registerLogicServer('server-2', 'localhost', 9002, { weight: 2 });
  gateway.registerLogicServer('server-3', 'localhost', 9003, { weight: 1 });

  // Create client
  const client = new RpcClient({ host: 'localhost', port: 8080 });

  // Send 30 requests
  const results = new Map();
  for (let i = 0; i < 30; i++) {
    const result = await client.call('test.echo', { index: i });
    const count = results.get(result.server) || 0;
    results.set(result.server, count + 1);
  }

  // Print distribution
  console.log('Request Distribution:');
  for (const [server, count] of results) {
    const percentage = ((count / 30) * 100).toFixed(1);
    console.log(`  ${server}: ${count} requests (${percentage}%)`);
  }

  // Cleanup
  await client.disconnect();
  for (const server of servers) {
    await server.stop();
  }
  await gateway.stop();
}

async function main() {
  // Test each strategy
  await testStrategy('round-robin');
  await testStrategy('least-connections');
  await testStrategy('weighted');

  console.log('\n=== Load Balancing Test Complete ===');
  process.exit(0);
}

main().catch(console.error);
