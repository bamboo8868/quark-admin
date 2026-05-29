import { getDatabase } from '../config/database.js';

/**
 * Shorthand database access — returns a Knex query builder for the given table.
 *
 * Usage (identical to raw Knex):
 *   import { db } from '../utils/db.js';
 *
 *   // Select
 *   await db('users').where('id', 1).first();
 *   await db('users').select('id', 'username');
 *
 *   // Join
 *   await db('users as u')
 *     .join('depts as d', 'u.dept_id', 'd.id')
 *     .select('u.id', 'u.username', 'd.name as dept_name');
 *
 *   // Insert
 *   await db('users').insert({ username: 'test', password: '123' });
 *
 *   // Update
 *   await db('users').where('id', 1).update({ status: 0 });
 *
 *   // Delete
 *   await db('users').where('id', 1).del();
 *
 *   // Raw SQL
 *   await db.raw('SELECT * FROM users WHERE id = ?', [1]);
 *
 *   // Transaction
 *   await db.transaction(async (trx) => {
 *     await trx('users').insert({ username: 'test' });
 *     await trx('logs').insert({ action: 'create' });
 *   });
 */
export function db(tableName) {
  return getDatabase()(tableName);
}

/**
 * Access the raw Knex instance for .raw(), .transaction(), .schema, etc.
 *
 *   import { knex } from '../utils/db.js';
 *   await knex.raw('SELECT NOW()');
 *   await knex.transaction(async (trx) => { ... });
 */
export function getKnex() {
  return getDatabase();
}

// Alias — some devs prefer `knex` import
export { getKnex as knex };

export default db;
