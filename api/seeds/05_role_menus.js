/**
 * Seed role menus
 */
export async function seed(knex) {
  // Deletes ALL existing entries
  await knex('role_menus').del();

  // Admin role (id: 1) - all menus
  const adminMenus = [
    100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 
    200, 201, 202, 203, 204, 210, 211, 212, 220, 221, 222,
    300, 301, 302, 303, 304,
    400, 401, 402, 403, 404,
    500, 501, 502, 503
  ];

  // Common role (id: 2) - limited menus
  const commonMenus = [
    100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
    404, 500, 501, 502, 503
  ];

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
