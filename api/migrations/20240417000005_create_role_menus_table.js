/**
 * Create role_menus junction table
 */
export async function up(knex) {
  await knex.schema.createTable('role_menus', (table) => {
    table.increments('id').primary();
    table.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.integer('menu_id').unsigned().notNullable().references('id').inTable('menus').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.unique(['role_id', 'menu_id']);
  });

  await knex.schema.table('role_menus', (table) => {
    table.index('role_id');
    table.index('menu_id');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('role_menus');
}
