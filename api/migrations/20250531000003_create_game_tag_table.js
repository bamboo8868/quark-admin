/**
 * Create game_tag table
 */
export async function up(knex) {
  await knex.schema.createTable('game_tag', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().defaultTo('').comment('标签名称');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('game_tag', (table) => {
    table.unique('name');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('game_tag');
}
