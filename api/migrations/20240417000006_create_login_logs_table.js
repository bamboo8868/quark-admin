/**
 * Create login logs table
 */
export async function up(knex) {
  await knex.schema.createTable('login_logs', (table) => {
    table.increments('id').primary();
    table.string('username', 50).notNullable();
    table.string('ip', 50).notNullable().defaultTo('');
    table.string('address', 200).notNullable().defaultTo('');
    table.string('system', 50).notNullable().defaultTo('');
    table.string('browser', 50).notNullable().defaultTo('');
    table.tinyint('status').notNullable().defaultTo(1).comment('0: failed, 1: success');
    table.string('behavior', 100).notNullable().defaultTo('').comment('login type');
    table.timestamp('login_time').defaultTo(knex.fn.now());
  });

  await knex.schema.table('login_logs', (table) => {
    table.index('username');
    table.index('status');
    table.index('login_time');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('login_logs');
}
