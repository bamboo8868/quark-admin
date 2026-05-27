/**
 * Create email_accounts table
 */
export async function up(knex) {
  await knex.schema.createTable('email_accounts', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().comment('Owner user ID');
    table.string('host', 255).notNullable().comment('IMAP server host');
    table.integer('port').notNullable().defaultTo(993).comment('IMAP server port');
    table.boolean('tls').notNullable().defaultTo(true).comment('Use TLS');
    table.string('username', 255).notNullable().comment('IMAP login username');
    table.string('password', 255).notNullable().comment('IMAP login password');
    table.string('display_name', 100).notNullable().defaultTo('').comment('Account display name');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('email_accounts', (table) => {
    table.index('user_id');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('email_accounts');
}
