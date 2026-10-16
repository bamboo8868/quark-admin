/**
 * Add `type` column to config_carousel: distinguishes offline (离线) vs rent (租号).
 * Default 'offline' so existing banners keep showing on the offline page.
 */
export async function up(knex) {
  await knex.schema.alterTable('config_carousel', (table) => {
    table.string('type', 20).notNullable().defaultTo('offline').comment('类型：offline=离线, rent=租号');
    table.index('type');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('config_carousel', (table) => {
    table.dropIndex('type');
    table.dropColumn('type');
  });
}
