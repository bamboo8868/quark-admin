/**
 * Create emails table
 */
export async function up(knex) {
  await knex.schema.createTable('emails', (table) => {
    table.increments('id').primary();
    table.integer('account_id').unsigned().notNullable();
    table.string('uid', 50).notNullable();
    table.string('message_id', 500).nullable();
    table.string('subject', 1000).nullable();
    table.text('from_address').nullable();
    table.text('to_address').nullable();
    table.timestamp('mail_date').nullable();
    table.text('flags').nullable();
    table.boolean('is_read').notNullable().defaultTo(false);
    table.longtext('body_text').nullable();
    table.longtext('body_html').nullable();
    table.string('game_account', 255).nullable();
    table.string('code', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('emails', (table) => {
    table.unique(['account_id', 'uid']);
    table.index('account_id');
    table.index('mail_date');
    table.index('message_id');
    table.index('game_account');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('emails');
}
