/**
 * Create departments table
 */
export async function up(knex) {
  await knex.schema.createTable('depts', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable();
    table.integer('parent_id').unsigned().notNullable().defaultTo(0).comment('0 for root dept');
    table.integer('sort').notNullable().defaultTo(0);
    table.string('phone', 20).notNullable().defaultTo('');
    table.string('principal', 50).notNullable().defaultTo('');
    table.string('email', 100).notNullable().defaultTo('');
    table.tinyint('status').notNullable().defaultTo(1).comment('0: disabled, 1: enabled');
    table.tinyint('type').notNullable().defaultTo(3).comment('1: company, 2: branch, 3: dept');
    table.text('remark').notNullable().defaultTo('');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('depts', (table) => {
    table.index('parent_id');
    table.index('status');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('depts');
}
