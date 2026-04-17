/**
 * Create user_roles junction table
 */
export async function up(knex) {
  await knex.schema.createTable('user_roles', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('role_id').unsigned().notNullable().references('id').inTable('roles').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Unique constraint
    table.unique(['user_id', 'role_id']);
  });

  await knex.schema.table('user_roles', (table) => {
    table.index('user_id');
    table.index('role_id');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('user_roles');
}
