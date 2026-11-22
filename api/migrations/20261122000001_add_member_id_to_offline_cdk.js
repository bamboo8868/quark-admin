/**
 * Bind offline CDKs to member accounts:
 * add member_id to offline_cdk, filled when a logged-in member redeems the CDK.
 * NULL means the CDK was redeemed by a guest (or not redeemed yet).
 */
export async function up(knex) {
  await knex.schema.alterTable('offline_cdk', (table) => {
    table.integer('member_id').unsigned().nullable().comment('绑定会员ID(登录兑换时填入)');
    table.index('member_id');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('offline_cdk', (table) => {
    table.dropIndex('member_id');
    table.dropColumn('member_id');
  });
}