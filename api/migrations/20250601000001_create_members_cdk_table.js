/**
 * Create members_cdk table - CDK codes for membership upgrades
 */
export async function up(knex) {
  await knex.schema.createTable('members_cdk', (table) => {
    table.increments('id').primary();

    // === CDK 基本信息 ===
    table.string('cdk_code', 50).notNullable().unique().comment('CDK兑换码');
    table.tinyint('member_level').notNullable().defaultTo(1).comment('对应会员等级：1=青铜, 2=黄金');
    table.tinyint('duration_months').notNullable().defaultTo(3).comment('会员时长(月)：3/6/9/12');

    // === CDK 状态 ===
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=可用, 2=已使用');
    table.integer('used_by').unsigned().nullable().comment('使用者 member_id');
    table.timestamp('used_at').nullable().comment('使用时间');

    // === 管理信息 ===
    table.text('remark').notNullable().defaultTo('').comment('备注');
    table.string('batch_no', 50).notNullable().defaultTo('').comment('批次号(批量生成)');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('members_cdk', (table) => {
    table.index('status');
    table.index('member_level');
    table.index('batch_no');
    table.index('used_by');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('members_cdk');
}
