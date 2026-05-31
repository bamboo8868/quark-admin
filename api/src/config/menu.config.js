/**
 * Static menu configuration
 * Menus are defined here instead of the database.
 * Each menu has a unique id, used for role-menu binding in role_menus table.
 */

const SYSTEM_RANK = 10;
const MONITOR_RANK = 11;
const EMAIL_RANK = 12;
const GAME_RANK = 13;

export const menuConfig = [
  {
    id: 1000,
    parentId: 0,
    menuType: 0,
    title: 'menus.pureSysManagement',
    name: 'System',
    path: '/system',
    icon: 'ri:settings-3-line',
    rank: SYSTEM_RANK,
    children: [
      {
        id: 1001,
        parentId: 1000,
        menuType: 0,
        title: 'menus.pureUser',
        name: 'SystemUser',
        path: '/system/user/index',
        icon: 'ri:admin-line',
      },
      {
        id: 1002,
        parentId: 1000,
        menuType: 0,
        title: 'menus.pureRole',
        name: 'SystemRole',
        path: '/system/role/index',
        icon: 'ri:admin-fill',
      },
      {
        id: 1003,
        parentId: 1000,
        menuType: 0,
        title: 'menus.pureDept',
        name: 'SystemDept',
        path: '/system/dept/index',
        icon: 'ri:git-branch-line',
      }
    ]
  },
  // {
  //   id: 2000,
  //   parentId: 0,
  //   menuType: 0,
  //   title: 'menus.pureSysMonitor',
  //   name: 'Monitor',
  //   path: '/monitor',
  //   icon: 'ep:monitor',
  //   rank: MONITOR_RANK,
  //   children: [
  //     {
  //       id: 2001,
  //       parentId: 2000,
  //       menuType: 0,
  //       title: 'menus.pureOnlineUser',
  //       name: 'OnlineUser',
  //       path: '/monitor/online-user',
  //       component: 'monitor/online/index',
  //       icon: 'ri:user-voice-line',
  //     },
  //     {
  //       id: 2002,
  //       parentId: 2000,
  //       menuType: 0,
  //       title: 'menus.pureLoginLog',
  //       name: 'LoginLog',
  //       path: '/monitor/login-logs',
  //       component: 'monitor/logs/login/index',
  //       icon: 'ri:window-line',
  //     },
  //     {
  //       id: 2003,
  //       parentId: 2000,
  //       menuType: 0,
  //       title: 'menus.pureOperationLog',
  //       name: 'OperationLog',
  //       path: '/monitor/operation-logs',
  //       component: 'monitor/logs/operation/index',
  //       icon: 'ri:history-fill',
  //     },
  //     {
  //       id: 2004,
  //       parentId: 2000,
  //       menuType: 0,
  //       title: 'menus.pureSystemLog',
  //       name: 'SystemLog',
  //       path: '/monitor/system-logs',
  //       component: 'monitor/logs/system/index',
  //       icon: 'ri:file-search-line',
  //     }
  //   ]
  // },
  {
    id: 3000,
    parentId: 0,
    menuType: 0,
    title: 'menus.pureEmailManagement',
    name: 'Email',
    path: '/email',
    icon: 'ri:mail-line',
    rank: EMAIL_RANK,
    children: [
      {
        id: 3001,
        parentId: 3000,
        menuType: 0,
        title: 'menus.pureMailManage',
        name: 'MailManage',
        path: '/email/mail/index',
        component: 'email/mail/index',
        icon: 'ri:inbox-line'
      },
      {
        id: 3002,
        parentId: 3000,
        menuType: 0,
        title: 'menus.pureAccountManage',
        name: 'AccountManage',
        path: '/email/account/index',
        component: 'email/account/index',
        icon: 'ri:account-circle-line'
      }
    ]
  },
  {
    id: 4000,
    parentId: 0,
    menuType: 0,
    title: 'menus.pureGameManagement',
    name: 'Game',
    path: '/game',
    icon: 'ri:gamepad-line',
    rank: GAME_RANK,
    children: [
      {
        id: 4001,
        parentId: 4000,
        menuType: 0,
        title: 'menus.pureGameAccount',
        name: 'GameAccount',
        path: '/game/account/index',
        component: 'game/account/index',
        icon: 'ri:key-2-line'
      },
      {
        id: 4002,
        parentId: 4000,
        menuType: 0,
        title: 'menus.pureDencryptedAccount',
        name: 'AccountAccessRecords',
        path: '/game/account-access/index',
        component: 'account-access/index',
        icon: 'ri:lock-password-line'
      }
    ]
  }
];

/**
 * Get flat list of all menus (with parentId for tree building)
 */
export function getFlatMenuList() {
  const result = [];
  function flatten(menus) {
    for (const menu of menus) {
      const { children, ...rest } = menu;
      result.push(rest);
      if (children && children.length > 0) {
        flatten(children);
      }
    }
  }
  flatten(menuConfig);
  return result;
}

/**
 * Get menu by ID
 */
export function getMenuById(id) {
  return getFlatMenuList().find(m => m.id === id) || null;
}

/**
 * Build async routes from menu config, filtered by user roles
 * Used for admin users who see all menus
 */
export function buildAsyncRoutes(userRoles = []) {
  function filterByRoles(menus, roles) {
    return menus
      .filter(menu => {
        // Skip button-level items (menuType: 2) — they are permission markers, not routes
        if (menu.menuType === 2) return false;
        // Empty roles array means no filtering (admin sees all)
        if (roles.length === 0) return true;
        // If no roles restriction on menu, allow all
        if (!menu.roles || menu.roles.length === 0) return true;
        // Check if any user role matches
        return menu.roles.some(r => roles.includes(r));
      })
      .map(menu => {
        const route = {
          path: menu.path,
          name: menu.name,
          meta: {
            icon: menu.icon,
            title: menu.title,
            // Directory items with children should always show as sub-menu,
            // never flatten into parent level even if only one child
            ...(menu.menuType === 0 && menu.children?.length > 0 && { alwaysShow: true }),
            ...(menu.rank !== undefined && { rank: menu.rank }),
            ...(menu.roles && { roles: menu.roles })
          }
        };
        if (menu.component) {
          route.component = menu.component;
        }
        // Filter button-level children, then only set children if non-empty
        const filteredChildren = menu.children?.filter(c => c.menuType !== 2);
        if (filteredChildren && filteredChildren.length > 0) {
          route.children = filterByRoles(filteredChildren, roles);
        }
        return route;
      });
  }

  return filterByRoles(menuConfig, userRoles);
}

/**
 * Build async routes from menu config, filtered by menu IDs
 * Used for non-admin users whose allowed menus come from role_menus table
 */
export function buildAsyncRoutesByMenuIds(menuIds = []) {
  const menuIdSet = new Set(menuIds);

  function filterByMenuIds(menus) {
    return menus
      .filter(menu => {
        // Skip button-level items (menuType: 2) — they are permission markers, not routes
        if (menu.menuType === 2) return false;
        return menuIdSet.has(menu.id);
      })
      .map(menu => {
        const route = {
          path: menu.path,
          name: menu.name,
          meta: {
            icon: menu.icon,
            title: menu.title,
            // Directory items with children should always show as sub-menu,
            // never flatten into parent level even if only one child
            ...(menu.menuType === 0 && menu.children?.length > 0 && { alwaysShow: true }),
            ...(menu.rank !== undefined && { rank: menu.rank })
          }
        };
        if (menu.component) {
          route.component = menu.component;
        }
        // Filter button-level children, then only set children if non-empty
        const filteredChildren = menu.children?.filter(c => c.menuType !== 2);
        if (filteredChildren && filteredChildren.length > 0) {
          route.children = filterByMenuIds(filteredChildren);
        }
        return route;
      });
  }

  return filterByMenuIds(menuConfig);
}

/**
 * Get flat menu list for role-menu assignment (used by role management)
 * Returns flat array with id, parentId, title, menuType — the frontend
 * calls handleTree() on this to build the tree for the tree component.
 */
export function getMenuTree() {
  return getFlatMenuList().map(m => ({
    id: m.id,
    parentId: m.parentId,
    menuType: m.menuType,
    title: m.title,
    ...(m.permission && { permission: m.permission })
  }));
}
