/**
 * Add missing columns to rent_games table
 */
export async function up(knex) {
  await knex.schema.alterTable('rent_games', (table) => {
    table.string('cover', 500).notNullable().defaultTo('').after('name').comment('封面图片');
    table.string('platform', 50).notNullable().defaultTo('Steam').after('cover').comment('平台');
    table.text('description').nullable().after('platform').comment('描述');
    table.decimal('price', 10, 2).notNullable().defaultTo(0).after('description').comment('价格');
    table.tinyint('status').notNullable().defaultTo(1).after('price').comment('状态：0=禁用, 1=启用');
    table.index('status');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('rent_games', (table) => {
    table.dropIndex('status');
    table.dropColumn('cover');
    table.dropColumn('platform');
    table.dropColumn('description');
    table.dropColumn('price');
    table.dropColumn('status');
  });
}
