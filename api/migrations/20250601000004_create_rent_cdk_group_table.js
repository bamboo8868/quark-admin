/**
 * Create rent_cdk_group table and add group_id to rent_cdk
 */
export async function up(knex) {
  // CDK groups (batches)
  await knex.schema.createTable('rent_cdk_group', (table) => {
    table.increments('id').primary();
    table.integer('game_id').unsigned().notNullable().comment('关联游戏ID');
    table.string('name', 200).notNullable().defaultTo('').comment('CDK组名称');
    table.integer('count').unsigned().notNullable().defaultTo(0).comment('生成数量');
    table.integer('rent_hours').notNullable().defaultTo(24).comment('出租时长(小时)');
    table.timestamp('expire_at').nullable().comment('CDK过期时间');
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=启用');
    table.string('remark', 500).notNullable().defaultTo('').comment('备注');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('game_id');
    table.index('status');
  });

  // Add group_id to rent_cdk
  await knex.schema.alterTable('rent_cdk', (table) => {
    table.integer('group_id').unsigned().nullable().after('id').comment('关联CDK组ID');
    table.index('group_id');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('rent_cdk', (table) => {
    table.dropIndex('group_id');
    table.dropColumn('group_id');
  });
  await knex.schema.dropTableIfExists('rent_cdk_group');
}
