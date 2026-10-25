/**
 * Add is_top (置顶) flag to the games table so admins can pin member-library
 * games to the top of the member center list. 0 = normal, 1 = pinned.
 */
export async function up(knex) {
  await knex.schema.table('games', (table) => {
    table.tinyint('is_top').notNullable().defaultTo(0).comment('是否置顶：0否 1是');
    table.index('is_top');
  });
}

export async function down(knex) {
  await knex.schema.table('games', (table) => {
    table.dropIndex('is_top');
    table.dropColumn('is_top');
  });
}
