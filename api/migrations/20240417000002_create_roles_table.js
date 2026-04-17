/**
 * Create roles table
 */
export async function up(knex) {
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.string('code', 50).notNullable().unique();
    table.tinyint('status').defaultTo(1).comment('0: disabled, 1: enabled');
    table.text('remark').notNullable().defaultTo('');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('roles', (table) => {
    table.index('code');
    table.index('status');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('roles');
}
