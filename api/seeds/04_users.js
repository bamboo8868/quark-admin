import bcrypt from 'bcryptjs';

/**
 * Seed users
 */
export async function seed(knex) {
  // Deletes ALL existing entries
  await knex('users').del();

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Insert seed entries
  await knex('users').insert([
    {
      id: 1,
      username: 'admin',
      nickname: '小铭',
      email: 'admin@company.com',
      phone: '15888886789',
      avatar: 'https://avatars.githubusercontent.com/u/44761321',
      password: hashedPassword,
      sex: 0,
      status: 1,
      dept_id: 103,
      remark: '管理员',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 2,
      username: 'common',
      nickname: '小林',
      email: 'common@company.com',
      phone: '18288882345',
      avatar: 'https://avatars.githubusercontent.com/u/52823142',
      password: hashedPassword,
      sex: 1,
      status: 1,
      dept_id: 105,
      remark: '普通用户',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  // Assign roles to users
  await knex('user_roles').del();
  await knex('user_roles').insert([
    { user_id: 1, role_id: 1, created_at: new Date() },
    { user_id: 2, role_id: 2, created_at: new Date() }
  ]);
}
