import { IPv4, newWithBuffer, loadContentFromFile, verifyFromFile } from 'ip2region.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { log } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../', 'data', 'ip2region_v4.xdb');

let searcher = null;

/**
 * Initialize ip2region searcher (singleton, loads xdb into memory)
 */
export function initIp2Region() {
  if (searcher) return searcher;

  try {
    verifyFromFile(dbPath);
    const cBuffer = loadContentFromFile(dbPath);
    searcher = newWithBuffer(IPv4, cBuffer);
    log.info('[ip2region] initialized successfully');
    return searcher;
  } catch (e) {
    log.error(`[ip2region] init failed: ${e.message}`);
    return null;
  }
}

/**
 * Search IP region info
 * @param {string} ip
 * @returns {string} region string like "中国|0|广东省|深圳市|电信"
 */
export function searchIp(ip) {
  if (!searcher) {
    initIp2Region();
  }
  if (!searcher) {
    throw new Error('ip2region not initialized');
  }
  return searcher.search(ip);
}

/**
 * Get client IP from Fastify request (supports X-Forwarded-For)
 * @param {import('fastify').FastifyRequest} request
 * @returns {string}
 */
export function getClientIp(request) {
  return request.ip
    || request.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || request.headers['x-real-ip']
    || '';
}
