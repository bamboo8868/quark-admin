export async function up(knex) {
  await knex.schema.table('accounts_simple', (table) => {
    table.string('nickname', 100).nullable().defaultTo('').after('account').comment('Steam昵称');
  });
}

export async function down(knex) {
  await knex.schema.table('accounts_simple', (table) => {
    table.dropColumn('nickname');
  });
}
