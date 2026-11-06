/**
 * Create sda_account table (总SDA账号管理表)
 * Every SDA/maFile import archives the raw file content here, upserted by account_name
 */
export async function up(knex) {
  await knex.schema.createTable('sda_account', (table) => {
    table.increments('id').primary();
    table.string('account_name', 64).notNullable().unique().comment('Steam账号名');
    table.string('shared_secret', 255).notNullable().defaultTo('').comment('动态码密钥');
    table.string('identity_secret', 255).notNullable().defaultTo('').comment('身份确认密钥');
    table.text('content', 'longtext').comment('SDA文件原始JSON内容');
    table.string('source', 32).notNullable().defaultTo('').comment('最近导入来源模块');
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('首次导入时间');
    table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('最近导入时间');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('sda_account');
}