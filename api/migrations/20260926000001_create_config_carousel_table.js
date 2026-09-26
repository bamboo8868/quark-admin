/**
 * Create config module tables:
 * config_carousel (轮播图管理 - image + link)
 */
export async function up(knex) {
  await knex.schema.createTable('config_carousel', (table) => {
    table.increments('id').primary();
    table.string('title', 200).notNullable().defaultTo('').comment('标题');
    // base64 data URL can be large; mediumtext (16MB) is safe for banners
    table.text('image', 'mediumtext').nullable().comment('图片(base64 data URL)');
    table.string('link', 500).notNullable().defaultTo('').comment('跳转链接');
    table.integer('sort').notNullable().defaultTo(0).comment('排序值(越小越靠前)');
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=启用');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('status');
    table.index('sort');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('config_carousel');
}
