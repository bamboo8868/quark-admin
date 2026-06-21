/**
 * Add rent_start_at and rent_end_at columns to rent_game_account
 */
export async function up(knex) {
  await knex.schema.alterTable('rent_game_account', (table) => {
    table.timestamp('rent_start_at').nullable().after('status').comment('出租起始时间');
    table.timestamp('rent_end_at').nullable().after('rent_start_at').comment('出租结束时间');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('rent_game_account', (table) => {
    table.dropColumn('rent_start_at');
    table.dropColumn('rent_end_at');
  });
}
