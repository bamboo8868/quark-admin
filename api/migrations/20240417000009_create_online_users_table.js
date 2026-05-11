/**
 * Create online users table
 */
export async function up(knex) {
  await knex.schema.createTable('online_users', (table) => {
    table.increments('id').primary();
    table.string('username', 50).notNullable();
    table.string('token', 500).notNullable().defaultTo('');
    table.string('ip', 50).notNullable().defaultTo('');
    table.string('address', 200).notNullable().defaultTo('');
    table.string('system', 50).notNullable().defaultTo('');
    table.string('browser', 50).notNullable().defaultTo('');
    table.timestamp('login_time').defaultTo(knex.fn.now());
    table.timestamp('expire_time').nullable();
  });

  await knex.schema.table('online_users', (table) => {
    table.index('username');
    table.index('token');
    table.index('login_time');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('online_users');
}
