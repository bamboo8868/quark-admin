/**
 * Create members table - front-end user registration
 */
export async function up(knex) {
  await knex.schema.createTable('members', (table) => {
    table.increments('id').primary();

    // === 基础账号信息 ===
    table.string('username', 50).notNullable().comment('登录账号');
    table.string('password', 255).notNullable().comment('密码(bcrypt)');
    table.string('email', 120).notNullable().defaultTo('').comment('邮箱');
    table.string('phone', 20).notNullable().defaultTo('').comment('手机号');

    // === 个人资料 ===
    table.string('nickname', 100).notNullable().defaultTo('').comment('昵称');
    table.string('avatar', 500).notNullable().defaultTo('').comment('头像地址');
    table.tinyint('gender').notNullable().defaultTo(0).comment('性别：0=未知, 1=男, 2=女');
    table.date('birthday').nullable().comment('生日');
    table.string('signature', 255).notNullable().defaultTo('').comment('个性签名');

    // === 会员体系 ===
    table.integer('member_level').notNullable().defaultTo(0).comment('会员等级：0=普通用户');
    table.timestamp('member_expire_at').nullable().comment('会员到期时间');

    // === 账号状态 ===
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=正常');
    table.tinyint('email_verified').notNullable().defaultTo(0).comment('邮箱验证：0=未验证, 1=已验证');

    // === 登录信息 ===
    table.timestamp('last_login_at').nullable().comment('最后登录时间');
    table.string('last_login_ip', 50).notNullable().defaultTo('').comment('最后登录IP');
    table.integer('login_count').notNullable().defaultTo(0).comment('累计登录次数');

    // === 时间戳 ===
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('members', (table) => {
    table.unique('username');
    table.index('email');
    table.index('phone');
    table.index('status');
    table.index('member_level');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('members');
}
