/**
 * Create offline game module tables:
 * offline_games, offline_game_version, offline_game_account,
 * offline_cdk, offline_cdk_group, offline_log
 */
export async function up(knex) {
  // Games
  await knex.schema.createTable('offline_games', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().defaultTo('').comment('游戏名称');
    table.string('cover', 500).notNullable().defaultTo('').comment('封面图片');
    table.string('platform', 50).notNullable().defaultTo('Steam').comment('平台');
    table.text('description').nullable().comment('描述');
    table.decimal('price', 10, 2).notNullable().defaultTo(0).comment('价格');
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=启用');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('status');
  });

  // Game versions
  await knex.schema.createTable('offline_game_version', (table) => {
    table.increments('id').primary();
    table.integer('game_id').unsigned().notNullable().comment('关联游戏ID');
    table.string('name', 200).notNullable().defaultTo('').comment('版本名称');
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=启用');
    table.string('remark', 500).notNullable().defaultTo('').comment('备注');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('game_id');
    table.index('status');
  });

  // Game accounts (linked to version)
  await knex.schema.createTable('offline_game_account', (table) => {
    table.increments('id').primary();
    table.integer('game_id').unsigned().notNullable().comment('关联游戏ID');
    table.integer('version_id').unsigned().notNullable().comment('关联版本ID');
    table.string('account', 120).notNullable().defaultTo('').comment('游戏账号');
    table.string('password', 255).notNullable().defaultTo('').comment('游戏密码');
    table.string('code', 255).notNullable().defaultTo('').comment('动态验证码(shared_secret)');
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=可用, 2=已兑换');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('game_id');
    table.index('version_id');
    table.index('status');
  });

  // CDK codes
  await knex.schema.createTable('offline_cdk', (table) => {
    table.increments('id').primary();
    table.integer('group_id').unsigned().nullable().comment('关联CDK组ID');
    table.integer('game_id').unsigned().notNullable().comment('关联游戏ID');
    table.integer('version_id').unsigned().notNullable().comment('关联版本ID');
    table.integer('account_id').unsigned().nullable().comment('关联账号ID(兑换时填入)');
    table.string('cdk_code', 100).notNullable().unique().comment('CDK码');
    table.tinyint('status').notNullable().defaultTo(0).comment('状态：0=未使用, 1=已使用, 2=已过期, 3=已禁用');
    table.string('used_by', 120).nullable().comment('使用者');
    table.timestamp('used_at').nullable().comment('使用时间');
    table.timestamp('expire_at').nullable().comment('CDK过期时间');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('game_id');
    table.index('version_id');
    table.index('group_id');
    table.index('cdk_code');
    table.index('status');
  });

  // CDK groups (batches)
  await knex.schema.createTable('offline_cdk_group', (table) => {
    table.increments('id').primary();
    table.integer('game_id').unsigned().notNullable().comment('关联游戏ID');
    table.integer('version_id').unsigned().notNullable().comment('关联版本ID');
    table.string('name', 200).notNullable().defaultTo('').comment('CDK组名称');
    table.integer('count').unsigned().notNullable().defaultTo(0).comment('生成数量');
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=启用');
    table.string('remark', 500).notNullable().defaultTo('').comment('备注');
    table.timestamp('expire_at').nullable().comment('CDK过期时间');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('game_id');
    table.index('version_id');
    table.index('status');
  });

  // Redemption logs
  await knex.schema.createTable('offline_log', (table) => {
    table.increments('id').primary();
    table.integer('cdk_id').unsigned().nullable().comment('关联CDK ID');
    table.integer('game_id').unsigned().nullable().comment('关联游戏ID');
    table.integer('version_id').unsigned().nullable().comment('关联版本ID');
    table.integer('account_id').unsigned().nullable().comment('关联账号ID');
    table.string('game_name', 100).notNullable().defaultTo('').comment('游戏名称(冗余)');
    table.string('version_name', 200).notNullable().defaultTo('').comment('版本名称(冗余)');
    table.string('cdk_code', 100).notNullable().defaultTo('').comment('CDK码(冗余)');
    table.string('account', 120).notNullable().defaultTo('').comment('账号(冗余)');
    table.string('action', 20).notNullable().defaultTo('redeem').comment('操作：redeem=兑换');
    table.string('username', 120).notNullable().defaultTo('').comment('操作人');
    table.string('ip', 50).notNullable().defaultTo('').comment('IP地址');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('cdk_id');
    table.index('game_id');
    table.index('version_id');
    table.index('account_id');
    table.index('username');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('offline_log');
  await knex.schema.dropTableIfExists('offline_cdk_group');
  await knex.schema.dropTableIfExists('offline_cdk');
  await knex.schema.dropTableIfExists('offline_game_account');
  await knex.schema.dropTableIfExists('offline_game_version');
  await knex.schema.dropTableIfExists('offline_games');
}
