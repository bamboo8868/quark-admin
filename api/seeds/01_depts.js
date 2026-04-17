/**
 * Seed departments
 */
export async function seed(knex) {
  // Deletes ALL existing entries
  await knex('depts').del();

  // Insert seed entries
  await knex('depts').insert([
    {
      id: 100,
      name: '杭州总公司',
      parent_id: 0,
      sort: 0,
      phone: '15888888888',
      principal: '张三',
      email: 'hangzhou@company.com',
      status: 1,
      type: 1,
      remark: '总公司',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 101,
      name: '郑州分公司',
      parent_id: 100,
      sort: 1,
      phone: '15888888888',
      principal: '李四',
      email: 'zhengzhou@company.com',
      status: 1,
      type: 2,
      remark: '分公司',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 102,
      name: '深圳分公司',
      parent_id: 100,
      sort: 2,
      phone: '15888888888',
      principal: '王五',
      email: 'shenzhen@company.com',
      status: 1,
      type: 2,
      remark: '分公司',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 103,
      name: '研发部门',
      parent_id: 101,
      sort: 1,
      phone: '15888888888',
      principal: '赵六',
      email: 'dev@company.com',
      status: 1,
      type: 3,
      remark: '研发部门',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 104,
      name: '市场部门',
      parent_id: 101,
      sort: 2,
      phone: '15888888888',
      principal: '钱七',
      email: 'market@company.com',
      status: 1,
      type: 3,
      remark: '市场部门',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 105,
      name: '测试部门',
      parent_id: 101,
      sort: 3,
      phone: '15888888888',
      principal: '孙八',
      email: 'test@company.com',
      status: 1,
      type: 3,
      remark: '测试部门',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 106,
      name: '财务部门',
      parent_id: 101,
      sort: 4,
      phone: '15888888888',
      principal: '周九',
      email: 'finance@company.com',
      status: 1,
      type: 3,
      remark: '财务部门',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 107,
      name: '运维部门',
      parent_id: 101,
      sort: 5,
      phone: '15888888888',
      principal: '吴十',
      email: 'ops@company.com',
      status: 1,
      type: 3,
      remark: '运维部门',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 108,
      name: '市场部门',
      parent_id: 102,
      sort: 1,
      phone: '15888888888',
      principal: '郑十一',
      email: 'market-sz@company.com',
      status: 1,
      type: 3,
      remark: '市场部门',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: 109,
      name: '财务部门',
      parent_id: 102,
      sort: 2,
      phone: '15888888888',
      principal: '王十二',
      email: 'finance-sz@company.com',
      status: 1,
      type: 3,
      remark: '财务部门',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}
