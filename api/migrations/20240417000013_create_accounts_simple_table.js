/**
 * Create accounts_simple table
 */
export async function up(knex) {
  await knex.schema.createTable('accounts_simple', (table) => {
    table.increments('id').primary();
    table.string('account', 64).notNullable().defaultTo('').comment('用户名');
    table.string('code', 64).notNullable().defaultTo('');
    table.tinyint('visible').notNullable().defaultTo(1).comment('是否显示：1=显示，0=隐藏');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('accounts_simple', (table) => {
    table.index('account');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('accounts_simple');
}
