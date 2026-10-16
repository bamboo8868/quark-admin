/**
 * Create config_announcement table (公告管理 - title + content).
 * Distinguishes offline (离线) vs rent (租号) via `type`.
 */
export async function up(knex) {
  await knex.schema.createTable('config_announcement', (table) => {
    table.increments('id').primary();
    table.string('type', 20).notNullable().defaultTo('offline').comment('类型：offline=离线, rent=租号');
    table.string('title', 200).notNullable().defaultTo('').comment('公告标题');
    table.text('content', 'mediumtext').nullable().comment('公告内容');
    table.integer('sort').notNullable().defaultTo(0).comment('排序值(越小越靠前)');
    table.tinyint('status').notNullable().defaultTo(1).comment('状态：0=禁用, 1=启用');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index('type');
    table.index('status');
    table.index('sort');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('config_announcement');
}
