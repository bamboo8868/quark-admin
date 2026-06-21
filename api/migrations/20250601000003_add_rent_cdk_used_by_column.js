/**
 * Add used_by column to rent_cdk table
 */
export async function up(knex) {
  await knex.schema.alterTable('rent_cdk', (table) => {
    table.string('used_by', 120).nullable().after('status').comment('使用者');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('rent_cdk', (table) => {
    table.dropColumn('used_by');
  });
}
