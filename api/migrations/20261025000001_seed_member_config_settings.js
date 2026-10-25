/**
 * Seed two more single-value site settings into the config_setting key-value
 * store (no schema change needed):
 *  - member_daily_game_limit: how many distinct member-library games a member
 *    may view/fetch per day (default 10, consumed by the web game endpoint).
 *  - customer_service_link: the global customer-service URL shown/opened by the
 *    member page when a purchase cannot proceed.
 * Rows are only inserted when absent so re-running never overwrites edits.
 */
export async function up(knex) {
  const defaults = [
    { key: 'member_daily_game_limit', value: '10' },
    { key: 'customer_service_link', value: '' }
  ];

  for (const row of defaults) {
    const existing = await knex('config_setting').where('key', row.key).first();
    if (!existing) {
      await knex('config_setting').insert(row);
    }
  }
}

export async function down(knex) {
  await knex('config_setting')
    .whereIn('key', ['member_daily_game_limit', 'customer_service_link'])
    .del();
}
