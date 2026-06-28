/**
 * Create member_cdk_group table and add group_id to members_cdk
 */
export async function up(knex) {
  // CDK groups (batches)
  await knex.schema.createTable('member_cdk_group', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable().defaultTo('').comment('CDK组名称');
    table.integer('count').unsigned().notNullable().defaultTo(0).comment('生成数量');
    table.tinyint('member_level').notNullable().defaultTo(1).comment('会员等级：1=青铜, 2=黄金');
    table.tinyint('duration_months').notNullable().defaultTo(3).comment('会员时长(月)');
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=启用');
    table.string('remark', 500).notNullable().defaultTo('').comment('备注');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('status');
  });

  // Add group_id to members_cdk
  await knex.schema.alterTable('members_cdk', (table) => {
    table.integer('group_id').unsigned().nullable().after('id').comment('关联CDK组ID');
    table.index('group_id');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('members_cdk', (table) => {
    table.dropIndex('group_id');
    table.dropColumn('group_id');
  });
  await knex.schema.dropTableIfExists('member_cdk_group');
}
