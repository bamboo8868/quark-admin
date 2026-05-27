/**
 * Seed role menus
 * Uses menu IDs from static menu config
 */
export async function seed(knex) {
  // Deletes ALL existing entries
  await knex('role_menus').del();

  // Menu IDs from static config (api/src/config/menu.config.js)
  // System Management: 1000 (parent), 1001 (User), 1002 (Role), 1003 (Dept)
  // System Monitor: 2000 (parent), 2001 (OnlineUser), 2002 (LoginLog), 2003 (OperationLog), 2004 (SystemLog)
  // Email Management: 3000 (parent), 3001 (MailManage), 3002 (AccountManage)

  // Admin role (id: 1) - all menus
  const adminMenus = [1000, 1001, 1002, 1003, 2000, 2001, 2002, 2003, 2004, 3000, 3001, 3002];

  // Common role (id: 2) - limited menus (monitor + email view)
  const commonMenus = [2000, 2001, 2002, 2003, 2004, 3000, 3001, 3002];

  const inserts = [];
  
  // Insert admin role menus
  for (const menuId of adminMenus) {
    inserts.push({
      role_id: 1,
      menu_id: menuId,
      created_at: new Date()
    });
  }
  
  // Insert common role menus
  for (const menuId of commonMenus) {
    inserts.push({
      role_id: 2,
      menu_id: menuId,
      created_at: new Date()
    });
  }

  await knex('role_menus').insert(inserts);
}
