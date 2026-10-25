/**
 * Add nickname (昵称) column to offline_game_account so admins can label each
 * offline account and fuzzy-search it in the account list.
 */
export async function up(knex) {
  await knex.schema.table('offline_game_account', (table) => {
    table.string('nickname', 100).nullable().defaultTo('').after('account').comment('账号昵称');
  });
}

export async function down(knex) {
  await knex.schema.table('offline_game_account', (table) => {
    table.dropColumn('nickname');
  });
}
