/**
 * Add role_ids column to depts table
 */
export async function up(knex) {
  await knex.schema.table('depts', (table) => {
    table.text('role_ids').notNullable().defaultTo('[]').comment('JSON array of role IDs bound to this department');
  });
}

export async function down(knex) {
  await knex.schema.table('depts', (table) => {
    table.dropColumn('role_ids');
  });
}
