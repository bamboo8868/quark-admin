/**
 * Seed the offline logout-page settings into the config_setting key-value
 * store (no schema change needed):
 *  - logout_enabled: whether the public logout feature is on ('1' / '0').
 *  - logout_daily_limit: max successful logouts per CDK per day (default 3).
 *  - logout_cooldown_seconds: minimum seconds between two logout attempts
 *    for the same CDK (default 60).
 * Rows are only inserted when absent so re-running never overwrites edits.
 */
export async function up(knex) {
  const defaults = [
    { key: 'logout_enabled', value: '1' },
    { key: 'logout_daily_limit', value: '3' },
    { key: 'logout_cooldown_seconds', value: '60' }
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
    .whereIn('key', ['logout_enabled', 'logout_daily_limit', 'logout_cooldown_seconds'])
    .del();
}