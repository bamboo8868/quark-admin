/**
 * Create game_account table - game account management
 */
export async function up(knex) {
  await knex.schema.createTable('game_account', (table) => {
    table.increments('id').primary();

    // === 关联信息 ===
    table.integer('game_id').unsigned().notNullable().defaultTo(0).comment('关联游戏ID');

    // === 账号信息 ===
    table.string('account', 120).notNullable().defaultTo('').comment('账号');
    table.string('password', 255).notNullable().defaultTo('').comment('密码');
    table.string('secret', 120).notNullable().defaultTo('').comment('密钥/令牌');

    // === 游戏属性 ===
    table.integer('level').notNullable().defaultTo(0).comment('游戏等级');
    table.string('platform', 50).notNullable().defaultTo('').comment('平台(Steam/Epic等)');

    // === 状态与备注 ===
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=启用');
    table.text('remark').comment('备注');

    // === 时间戳 ===
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('game_account', (table) => {
    table.index('game_id');
    table.index('account');
    table.index('status');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('game_account');
}
