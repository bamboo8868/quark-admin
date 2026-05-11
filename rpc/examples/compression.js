/**
 * Compression Benchmark Example
 * Demonstrates compression effectiveness
 */

import { RpcServer, RpcClient, CompressorType } from '../src/index.js';

function generateLargeData(size) {
  const data = [];
  for (let i = 0; i < size; i++) {
    data.push({
      id: i,
      name: `User ${i}`,
      email: `user${i}@example.com`,
      description: 'This is a long description that will benefit from compression. '.repeat(10)
    });
  }
  return data;
}

async function benchmarkCompression(compressorType, data) {
  const server = new RpcServer({ port: 8081 });
  
  server.register('data.echo', async (body) => {
    return { received: body.data.length, data: body.data };
  });

  await server.start();

  const client = new RpcClient({
    host: 'localhost',
    port: 8081,
    compressor: compressorType
  });

  const startTime = Date.now();
  const result = await client.call('data.echo', { data });
  const duration = Date.now() - startTime;

  await client.disconnect();
  await server.stop();

  return { duration, result };
}

async function main() {
  const dataSizes = [100, 500, 1000];
  
  console.log('=== Compression Benchmark ===\n');

  for (const size of dataSizes) {
    console.log(`--- Data Size: ${size} items ---`);
    const data = generateLargeData(size);
    const originalSize = JSON.stringify(data).length;
    console.log(`Original size: ${originalSize} bytes`);

    // No compression
    console.log('\nNo Compression:');
    const noneResult = await benchmarkCompression(CompressorType.NONE, data);
    console.log(`  Time: ${noneResult.duration}ms`);

    // Gzip
    console.log('\nGzip:');
    const gzipResult = await benchmarkCompression(CompressorType.GZIP, data);
    console.log(`  Time: ${gzipResult.duration}ms`);

    // Deflate
    console.log('\nDeflate:');
    const deflateResult = await benchmarkCompression(CompressorType.DEFLATE, data);
    console.log(`  Time: ${deflateResult.duration}ms`);

    console.log('\n' + '='.repeat(50) + '\n');
  }

  process.exit(0);
}

main().catch(console.error);
