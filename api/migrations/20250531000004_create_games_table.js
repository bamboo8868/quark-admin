/**
 * Create games table
 */
export async function up(knex) {
  await knex.schema.createTable('games', (table) => {
    table.increments('id').primary();
    table.string('name', 200).notNullable().defaultTo('').comment('游戏名称');
    table.text('desc').comment('游戏描述');
    table.string('img_url', 500).notNullable().defaultTo('').comment('图片地址');
    table.integer('category_id').unsigned().defaultTo(0).comment('游戏分类ID');
    table.json('tag_ids').comment('游戏标签ID数组，如 [1,2,3]');
    table.integer('member_level').notNullable().defaultTo(0).comment('会员级别');
    table.string('detail_url', 500).notNullable().defaultTo('').comment('详情页地址');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('games', (table) => {
    table.index('category_id');
    table.index('member_level');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('games');
}
