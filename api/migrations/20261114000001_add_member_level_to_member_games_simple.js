/**
 * Add member_level (会员等级) to member_games_simple so the admin simple-game
 * library can gate each entry by membership tier, mirroring the games table.
 * 0 = 游客, 1 = 会员, 2 = 高级会员.
 */
export async function up(knex) {
  await knex.schema.table('member_games_simple', (table) => {
    table
      .tinyint('member_level')
      .notNullable()
      .defaultTo(0)
      .comment('会员等级：0=游客,1=会员,2=高级会员')
      .after('code');
    table.index('member_level');
  });
}

export async function down(knex) {
  await knex.schema.table('member_games_simple', (table) => {
    table.dropIndex('member_level');
    table.dropColumn('member_level');
  });
}
