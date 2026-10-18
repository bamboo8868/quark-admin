/**
 * Add `refresh_count` column to offline_games: configures how many times per day
 * a redeemed CDK of this game may fetch the verification code (TOTP) via /refresh.
 * Default 3 so existing games keep the previous hard-coded behaviour.
 */
export async function up(knex) {
  await knex.schema.alterTable('offline_games', (table) => {
    table.integer('refresh_count').unsigned().notNullable().defaultTo(3).comment('每日验证码刷新次数上限');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('offline_games', (table) => {
    table.dropColumn('refresh_count');
  });
}
