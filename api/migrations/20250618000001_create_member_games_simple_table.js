/**
 * Create member_games_simple table
 * 会员简易游戏库：游戏名称 / 游戏账号 / 密码 / 动态验证码密钥(shared_secret)
 */
export async function up(knex) {
  await knex.schema.createTable('member_games_simple', (table) => {
    table.increments('id').primary();
    table.string('game_name', 128).notNullable().defaultTo('').comment('游戏名称');
    table.string('account', 64).notNullable().defaultTo('').comment('游戏账号');
    table.string('password', 128).notNullable().defaultTo('').comment('密码');
    table.string('code', 64).notNullable().defaultTo('').comment('动态验证码密钥(shared_secret)');
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：1=启用，0=禁用');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('member_games_simple', (table) => {
    table.index('game_name');
    table.index('account');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('member_games_simple');
}
