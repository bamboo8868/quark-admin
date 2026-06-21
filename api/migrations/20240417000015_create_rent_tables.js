/**
 * Create rent module tables: rent_games, rent_game_account, rent_cdk, rent_log
 */
export async function up(knex) {
  // Games available for rental
  await knex.schema.createTable('rent_games', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().defaultTo('').comment('游戏名称');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Game accounts available for rental (linked to rent_games)
  await knex.schema.createTable('rent_game_account', (table) => {
    table.increments('id').primary();
    table.integer('game_id').unsigned().notNullable().comment('关联游戏ID');
    table.string('account', 120).notNullable().defaultTo('').comment('游戏账号');
    table.string('password', 255).notNullable().defaultTo('').comment('游戏密码');
    table.string('code', 255).notNullable().defaultTo('').comment('动态验证吗');
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=可用, 2=已出租');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('game_id');
    table.index('status');
  });

  // CDK codes for redeeming game accounts (with rental duration)
  await knex.schema.createTable('rent_cdk', (table) => {
    table.increments('id').primary();
    table.integer('game_id').unsigned().notNullable().comment('关联游戏ID');
    table.integer('account_id').unsigned().nullable().comment('关联游戏账号ID');
    table.string('cdk_code', 100).notNullable().unique().comment('CDK码');
    table.integer('rent_hours').notNullable().defaultTo(24).comment('出租时长(小时)');
    table.tinyint('status').notNullable().defaultTo(0).comment('状态：0=未使用, 1=已使用, 2=已过期');
    table.timestamp('used_at').nullable().comment('使用时间');
    table.timestamp('expire_at').nullable().comment('CDK过期时间');
    table.timestamp('rent_expire_at').nullable().comment('租期到期时间');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('game_id');
    table.index('account_id');
    table.index('cdk_code');
    table.index('status');
  });

  // Redemption logs
  await knex.schema.createTable('rent_log', (table) => {
    table.increments('id').primary();
    table.integer('cdk_id').unsigned().nullable().comment('关联CDK ID');
    table.integer('game_id').unsigned().nullable().comment('关联游戏ID');
    table.integer('account_id').unsigned().nullable().comment('关联游戏账号ID');
    table.string('game_name', 100).notNullable().defaultTo('').comment('游戏名称(冗余)');
    table.string('cdk_code', 100).notNullable().defaultTo('').comment('CDK码(冗余)');
    table.string('account', 120).notNullable().defaultTo('').comment('账号(冗余)');
    table.integer('rent_hours').notNullable().defaultTo(0).comment('出租时长(小时)');
    table.string('action', 20).notNullable().defaultTo('redeem').comment('操作：redeem=兑换, return=归还');
    table.string('username', 120).notNullable().defaultTo('').comment('操作人');
    table.string('ip', 50).notNullable().defaultTo('').comment('IP地址');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('cdk_id');
    table.index('game_id');
    table.index('account_id');
    table.index('username');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('rent_log');
  await knex.schema.dropTableIfExists('rent_cdk');
  await knex.schema.dropTableIfExists('rent_game_account');
  await knex.schema.dropTableIfExists('rent_games');
}
