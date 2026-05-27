import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { getMenuTree } from '../config/menu.config.js';
import { getDatabase } from '../config/database.js';

/**
 * Extract user info from JWT token in request headers
 */
export function extractUser(request) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.substring(7);
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
}

/**
 * Get all permission strings for a user based on their role menus
 * Admin users get wildcard permission *:*:*
 */
async function getUserPermissions(roleIds) {
  const menuTree = getMenuTree();
  const permissionMap = new Map();

  // Build a map of id -> permission string (only button-level items have permissions)
  for (const item of menuTree) {
    if (item.permission) {
      permissionMap.set(item.id, item.permission);
    }
  }

  // For non-admin, look up which menu IDs they have access to via role_menus table
  const db = getDatabase();
  const allMenuIds = new Set();
  for (const roleId of roleIds) {
    const rows = await db('role_menus').where('role_id', roleId).select('menu_id');
    rows.forEach(r => allMenuIds.add(r.menu_id));
  }

  // Collect permission strings for the menu IDs the user has access to
  const permissions = [];
  for (const menuId of allMenuIds) {
    const perm = permissionMap.get(menuId);
    if (perm) {
      permissions.push(perm);
    }
  }
  return permissions;
}

/**
 * Permission check middleware factory
 * @param {string|string[]} requiredPermission - permission string(s) to check
 */
export function checkPermission(requiredPermission) {
  const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];

  return async function permissionHandler(request, reply) {
    const decoded = extractUser(request);
    if (!decoded) {
      return reply.send({ code: 10001, message: '未登录或Token已过期', data: null });
    }

    const roles = decoded.roles || [];

    // Admin has all permissions
    if (roles.includes('admin')) return;

    // Get user's permissions from role_menus
    const roleIds = decoded.roleIds || [];
    if (roleIds.length === 0) {
      return reply.send({ code: 10003, message: '没有操作权限', data: null });
    }

    const userPermissions = await getUserPermissions(roleIds);
    const hasPermission = required.some(perm => userPermissions.includes(perm));
    if (!hasPermission) {
      return reply.send({ code: 10003, message: '没有操作权限', data: null });
    }
  };
}
