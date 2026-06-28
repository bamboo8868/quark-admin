/**
 * Create member_cdk_log table - CDK usage logs for membership
 */
export async function up(knex) {
  await knex.schema.createTable('member_cdk_log', (table) => {
    table.increments('id').primary();
    table.integer('cdk_id').unsigned().nullable().comment('关联CDK ID');
    table.integer('member_id').unsigned().nullable().comment('关联会员ID');
    table.string('cdk_code', 100).notNullable().defaultTo('').comment('CDK码(冗余)');
    table.tinyint('member_level').notNullable().defaultTo(1).comment('会员等级(冗余)');
    table.tinyint('duration_months').notNullable().defaultTo(3).comment('会员时长(月)(冗余)');
    table.string('action', 20).notNullable().defaultTo('redeem').comment('操作：redeem=兑换, renew=续费');
    table.string('member_name', 120).notNullable().defaultTo('').comment('会员名称(冗余)');
    table.string('ip', 50).notNullable().defaultTo('').comment('IP地址');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index('cdk_id');
    table.index('member_id');
    table.index('action');
    table.index('cdk_code');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('member_cdk_log');
}
