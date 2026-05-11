/**
 * Create operation logs table
 */
export async function up(knex) {
  await knex.schema.createTable('operation_logs', (table) => {
    table.increments('id').primary();
    table.string('username', 50).notNullable();
    table.string('ip', 50).notNullable().defaultTo('');
    table.string('address', 200).notNullable().defaultTo('');
    table.string('system', 50).notNullable().defaultTo('');
    table.string('browser', 50).notNullable().defaultTo('');
    table.tinyint('status').notNullable().defaultTo(1).comment('0: failed, 1: success');
    table.string('summary', 200).notNullable().defaultTo('').comment('operation summary');
    table.string('module', 100).notNullable().defaultTo('');
    table.timestamp('operating_time').defaultTo(knex.fn.now());
  });

  await knex.schema.table('operation_logs', (table) => {
    table.index('username');
    table.index('module');
    table.index('status');
    table.index('operating_time');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('operation_logs');
}
