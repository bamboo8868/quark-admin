/**
 * Add password column to accounts_simple table
 */
export async function up(knex) {
  await knex.schema.table('accounts_simple', (table) => {
    table.string('password', 128).nullable().defaultTo('').after('code').comment('密码');
  });
}

export async function down(knex) {
  await knex.schema.table('accounts_simple', (table) => {
    table.dropColumn('password');
  });
}
