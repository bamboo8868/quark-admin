/**
 * Create menus table
 */
export async function up(knex) {
  await knex.schema.createTable('menus', (table) => {
    table.increments('id').primary();
    table.integer('parent_id').unsigned().notNullable().defaultTo(0).comment('0 for root menu');
    table.tinyint('menu_type').notNullable().defaultTo(0).comment('0: menu, 1: iframe, 2: external link, 3: button');
    table.string('title', 100).notNullable();
    table.string('name', 100).notNullable().defaultTo('');
    table.string('path', 200).notNullable().defaultTo('');
    table.string('component', 200).notNullable().defaultTo('');
    table.integer('rank').notNullable().defaultTo(0).comment('sort order');
    table.string('redirect', 200).notNullable().defaultTo('');
    table.string('icon', 100).notNullable().defaultTo('');
    table.string('extra_icon', 100).notNullable().defaultTo('');
    table.string('enter_transition', 100).notNullable().defaultTo('');
    table.string('leave_transition', 100).notNullable().defaultTo('');
    table.string('active_path', 200).notNullable().defaultTo('');
    table.string('auths', 200).notNullable().defaultTo('').comment('permission code');
    table.string('frame_src', 500).notNullable().defaultTo('');
    table.boolean('frame_loading').notNullable().defaultTo(true);
    table.boolean('keep_alive').notNullable().defaultTo(false);
    table.boolean('hidden_tag').notNullable().defaultTo(false);
    table.boolean('fixed_tag').notNullable().defaultTo(false);
    table.boolean('show_link').notNullable().defaultTo(true);
    table.boolean('show_parent').notNullable().defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('menus', (table) => {
    table.index('parent_id');
    table.index('menu_type');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('menus');
}
