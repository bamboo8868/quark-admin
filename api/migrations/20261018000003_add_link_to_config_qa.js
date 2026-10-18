/**
 * Add `link` column to config_qa: an optional jump/redirect URL.
 * On the offline & rent redemption pages, clicking a QA answer opens this link.
 */
export async function up(knex) {
  await knex.schema.alterTable('config_qa', (table) => {
    table.string('link', 500).notNullable().defaultTo('').comment('答案跳转链接');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('config_qa', (table) => {
    table.dropColumn('link');
  });
}
