/**
 * Create game_category table
 */
export async function up(knex) {
  await knex.schema.createTable('game_category', (table) => {
    table.increments('id').primary();
    table.string('name', 100).notNullable().defaultTo('').comment('分类名称');
    table.string('icon', 255).notNullable().defaultTo('').comment('图标地址');
    table.integer('sort_order').notNullable().defaultTo(0).comment('排序');
    table.tinyint('visible').notNullable().defaultTo(1).comment('是否显示：1=显示，0=隐藏');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('game_category', (table) => {
    table.index('sort_order');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('game_category');
}
