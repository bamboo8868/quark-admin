/**
 * Create config_setting table: a simple key-value store for single global
 * configuration values (e.g. the purchase link). Seeded with an empty
 * `purchase_link` row so the admin settings page always has something to update.
 */
export async function up(knex) {
  await knex.schema.createTable('config_setting', (table) => {
    table.increments('id').primary();
    table.string('key', 64).notNullable().unique().comment('配置键');
    table.text('value').nullable().comment('配置值');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex('config_setting').insert([
    { key: 'purchase_link', value: '' }
  ]);
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('config_setting');
}
