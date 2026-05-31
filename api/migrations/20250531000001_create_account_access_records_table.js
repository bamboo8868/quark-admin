/**
 * Create account_access_records table
 * Stores account credentials with view time tracking (last 5 views) and 24h view count
 */
export async function up(knex) {
  await knex.schema.createTable('account_access_records', (table) => {
    table.increments('id').primary();
    table.string('game_name', 100).notNullable().defaultTo('').comment('游戏名称');
    table.string('account', 64).notNullable().defaultTo('').comment('账号');
    table.string('password', 255).notNullable().defaultTo('').comment('密码');
    table.json('view_times').nullable().comment('最近5次查看时间，JSON数组格式');
    table.integer('view_count_24h').unsigned().notNullable().defaultTo(0).comment('24小时内查看次数');
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('创建时间');
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create index on account for quick lookup
  await knex.schema.table('account_access_records', (table) => {
    table.index('account');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('account_access_records');
}
