import db from './src/utils/db.js';

let res = await db('emails').first();

console.log(res);