import { IPv4, newWithBuffer, loadContentFromFile, verifyFromFile } from 'ip2region.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// xdb file path
const dbPath = join(__dirname, 'data', 'ip2region_v4.xdb');

// Verify xdb file compatibility
try {
  verifyFromFile(dbPath);
  console.log('xdb 文件验证通过\n');
} catch (e) {
  console.error(`xdb 文件验证失败: ${e.message}`);
  console.error('请确保 data/ip2region_v4.xdb 文件存在且版本兼容');
  process.exit(1);
}

// Load entire xdb into memory for fast queries
const cBuffer = loadContentFromFile(dbPath);
const searcher = newWithBuffer(IPv4, cBuffer);

async function main() {
// Test IPs
const testIPs = [
  '1.2.3.4',
  '8.8.8.8',
  '114.114.114.114',
  '223.5.5.5',
  '101.226.103.59',
  '180.101.50.242',
  '39.156.69.79',
  '120.232.138.62',
  '47.96.236.35',
  '210.21.118.173'
];

console.log('=== ip2region Demo ===\n');

for (const ip of testIPs) {
  try {
    const region = await searcher.search(ip);
    console.log(`${ip.padEnd(18)} => ${region}`);
  } catch (e) {
    console.error(`${ip.padEnd(18)} => 查询失败: ${e.message}`);
  }
}

console.log('\n=== 查询完成 ===');

}


main();
