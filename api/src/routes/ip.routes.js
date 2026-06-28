import { searchIp, getClientIp } from '../utils/ip2region.js';

/**
 * IP lookup routes - query IP geographic location
 */
export async function ipRoutes(app) {
  /**
   * GET /api/ip - Get current request's IP and region info
   */
  app.get('/ip', async (request, reply) => {
    const ip = request.query.ip;
    if (!ip) {
      return { code: 10001, message: '无法获取客户端IP', data: null };
    }

    try {
      const region = await searchIp(ip);
      console.log(region);
      const parts = region ? region.split('|') : [];

      return {
        code: 0,
        message: '操作成功',
        data: {
          ip,
          region: region || '',
          country: parts[0] !== '0' ? parts[0] || '' : '',
          province: parts[2] !== '0' ? parts[2] || '' : '',
          city: parts[3] !== '0' ? parts[3] || '' : '',
          isp: parts[4] !== '0' ? parts[4] || '' : ''
        }
      };
    } catch (e) {
      return { code: 10002, message: `IP查询失败: ${e.message}`, data: null };
    }
  });

  /**
   * GET /api/ip/:ip - Query specific IP's region info
   */
  app.get('/ip/:ip', async (request, reply) => {
    const { ip } = request.params;
    if (!ip) {
      return { code: 10001, message: '请输入IP地址', data: null };
    }

    try {
      const region = searchIp(ip);
      const parts = region ? region.split('|') : [];

      return {
        code: 0,
        message: '操作成功',
        data: {
          ip,
          region: region || '',
          country: parts[0] !== '0' ? parts[0] || '' : '',
          province: parts[2] !== '0' ? parts[2] || '' : '',
          city: parts[3] !== '0' ? parts[3] || '' : '',
          isp: parts[4] !== '0' ? parts[4] || '' : ''
        }
      };
    } catch (e) {
      return { code: 10002, message: `IP查询失败: ${e.message}`, data: null };
    }
  });
}
