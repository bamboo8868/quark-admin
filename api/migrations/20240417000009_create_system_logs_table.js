/**
 * Create system logs table
 */
export async function up(knex) {
  await knex.schema.createTable('system_logs', (table) => {
    table.increments('id').primary();
    table.tinyint('level').notNullable().defaultTo(1).comment('0: debug, 1: info, 2: warn, 3: error, 4: fatal');
    table.string('module', 100).notNullable().defaultTo('');
    table.string('url', 500).notNullable().defaultTo('');
    table.string('method', 10).notNullable().defaultTo('');
    table.string('ip', 50).notNullable().defaultTo('');
    table.string('address', 200).notNullable().defaultTo('');
    table.string('system', 50).notNullable().defaultTo('');
    table.string('browser', 50).notNullable().defaultTo('');
    table.integer('takes_time').notNullable().defaultTo(0).comment('request duration in ms');
    table.text('request_headers').notNullable().defaultTo('');
    table.text('request_body').notNullable().defaultTo('');
    table.text('response_headers').notNullable().defaultTo('');
    table.text('response_body').notNullable().defaultTo('');
    table.string('trace_id', 100).notNullable().defaultTo('');
    table.timestamp('request_time').defaultTo(knex.fn.now());
  });

  await knex.schema.table('system_logs', (table) => {
    table.index('level');
    table.index('module');
    table.index('trace_id');
    table.index('request_time');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('system_logs');
}
