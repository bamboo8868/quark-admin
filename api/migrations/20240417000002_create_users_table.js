/**
 * Create users table
 */
export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 50).notNullable().unique();
    table.string('nickname', 100).notNullable().defaultTo('');
    table.string('email', 100).notNullable().defaultTo('');
    table.string('phone', 20).notNullable().defaultTo('');
    table.string('avatar', 500).notNullable().defaultTo('');
    table.string('password', 255).notNullable();
    table.tinyint('sex').defaultTo(0).comment('0: unknown, 1: male, 2: female');
    table.tinyint('status').defaultTo(1).comment('0: disabled, 1: enabled');
    table.integer('dept_id').unsigned().notNullable().defaultTo(0);
    table.text('remark').notNullable().defaultTo('');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
  });

  // Create index
  await knex.schema.table('users', (table) => {
    table.index('username');
    table.index('status');
    table.index('dept_id');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('users');
}
