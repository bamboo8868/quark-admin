/**
 * Seed roles
 */
export async function seed(knex) {
  // Deletes ALL existing entries
  await knex('roles').del();

  // Insert seed entries
  await knex('roles').insert([
    {
      id: 1,
      name: '超级管理员',
      code: 'admin',
      status: 1,
      remark: '超级管理员拥有最高权限',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      name: '普通角色',
      code: 'common',
      status: 1,
      remark: '普通角色拥有部分权限',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}
