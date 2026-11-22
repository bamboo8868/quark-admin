export async function up(knex) {
  await knex.schema.table('accounts_simple', (table) => {
    table.string('game_name', 100).nullable().defaultTo('').after('nickname').comment('游戏名称');
  });
}

export async function down(knex) {
  await knex.schema.table('accounts_simple', (table) => {
    table.dropColumn('game_name');
  });
}