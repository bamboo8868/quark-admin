#!/usr/bin/env node

/**
 * Change Steam Nickname Script
 *
 * Logs into Steam and changes the account's persona name (nickname).
 * Mirrors syncNickname() in src/services/accountsSimple.service.js:
 *   login (account + password + TOTP from shared_secret) -> wait -> editProfile({ name })
 * Deliberately does NOT call flushAll (that would deauthorize the device).
 *
 * Usage:
 *   # DB mode — pull password + shared_secret(code) from accounts_simple
 *   node scripts/change-steam-nickname.js --id 1 --nickname "NewName"
 *   node scripts/change-steam-nickname.js --account someSteamUser --nickname "NewName"
 *   # DB mode — push the nickname already stored in the DB (like the admin "同步昵称" button)
 *   node scripts/change-steam-nickname.js --account someSteamUser
 *
 *   # Standalone mode — pass credentials directly (no database needed)
 *   node scripts/change-steam-nickname.js --account someSteamUser --password "pwd" --shared-secret "base64secret" --nickname "NewName"
 *
 * Options:
 *   --id             accounts_simple row id (DB mode)
 *   --account        Steam login name. In DB mode also used to locate the row.
 *   --password       Steam password (standalone mode, or override the DB value)
 *   --shared-secret  shared_secret from maFile/SDA (standalone mode, or override the DB value)
 *   --nickname       New persona name. If omitted in DB mode, uses the stored nickname.
 *   --delay          Delay in ms after login before editing (default 1000)
 *   --no-db-update   In DB mode, do NOT write the new nickname back to accounts_simple
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import knex from 'knex';
import SteamCommunity from 'steamcommunity';
import { generateAuthCode } from 'steam-totp';

// Load environment variables from api/.env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Parse CLI args. Supports `--key value`, boolean `--key`, and negated `--no-key`.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key.startsWith('no-')) {
      options[key.slice(3)] = false;
      continue;
    }
    if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
      options[key] = args[i + 1];
      i++;
    } else {
      options[key] = true;
    }
  }
  return options;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Turn a raw error into a message, adding a hint for network-level failures. */
function describeError(err) {
  const msg = err?.message || String(err);
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|ECONNREFUSED|ESOCKETTIMEDOUT|socket hang up|TLS|SSL/i.test(msg)) {
    return `${msg}\n    → 疑似网络问题：服务器无法与 Steam 建立稳定连接(TLS 被重置/超时)。\n      请为服务器配置可访问 steamcommunity.com 的代理/VPN 后重试。`;
  }
  return msg;
}

function printUsage() {
  console.log('用法示例:');
  console.log('  node scripts/change-steam-nickname.js --account someSteamUser --nickname "NewName"');
  console.log('  node scripts/change-steam-nickname.js --id 1 --nickname "NewName"');
  console.log('  node scripts/change-steam-nickname.js --account u --password p --shared-secret s --nickname "NewName"');
}

async function main() {
  const opts = parseArgs();

  if (opts.help) {
    printUsage();
    process.exit(0);
  }

  const delayMs = opts.delay !== undefined ? parseInt(opts.delay, 10) : 1000;

  console.log('========================================');
  console.log('  Change Steam Nickname');
  console.log('========================================');

  let accountName = opts.account;
  let password = opts.password;
  let sharedSecret = opts['shared-secret'];
  let nickname = opts.nickname;
  let db = null;
  let dbRow = null;

  // Standalone mode when both credentials are supplied directly
  const standalone = Boolean(password && sharedSecret);

  if (!standalone) {
    if (!opts.id && !accountName) {
      console.error('[✗] 请提供 --id 或 --account（或直接提供 --password 与 --shared-secret 走独立模式）\n');
      printUsage();
      process.exit(1);
    }

    db = knex({
      client: process.env.DB_CLIENT || 'mysql2',
      connection: {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        database: process.env.DB_NAME || 'zshop',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root'
      }
    });

    try {
      dbRow = opts.id
        ? await db('accounts_simple').where('id', opts.id).first()
        : await db('accounts_simple').where('account', accountName).first();
    } catch (e) {
      console.error('[✗] 数据库查询失败:', e.message);
      await db.destroy();
      process.exit(1);
    }

    if (!dbRow) {
      console.error(`[✗] 未找到账号: ${opts.id ? 'id=' + opts.id : accountName}`);
      await db.destroy();
      process.exit(1);
    }

    accountName = dbRow.account;
    password = password || dbRow.password;
    sharedSecret = sharedSecret || dbRow.code;
    nickname = nickname || dbRow.nickname;
    console.log(`  Mode:      DB (accounts_simple id=${dbRow.id})`);
  } else {
    console.log('  Mode:      Standalone (credentials from args)');
  }

  if (!accountName || !password || !sharedSecret) {
    console.error('[✗] 缺少必要信息：account / password / shared_secret(code) 都必须存在');
    if (db) await db.destroy();
    process.exit(1);
  }
  if (!nickname || !String(nickname).trim()) {
    console.error('[✗] 缺少昵称：请通过 --nickname 指定，或先在数据库中填写 nickname');
    if (db) await db.destroy();
    process.exit(1);
  }
  nickname = String(nickname).trim();

  console.log(`  Account:   ${accountName}`);
  console.log(`  Nickname:  ${nickname}`);
  console.log(`  Delay:     ${delayMs}ms after login`);
  console.log('========================================\n');

  const steam = new SteamCommunity();

  // Step 1: login
  console.log('[1/3] 登录 Steam...');
  let twoFactorCode;
  try {
    twoFactorCode = generateAuthCode(sharedSecret);
  } catch (e) {
    console.error('[✗] 生成验证码失败(shared_secret 可能无效):', e.message);
    if (db) await db.destroy();
    process.exit(1);
  }
  try {
    await new Promise((resolve, reject) => {
      steam.login({ accountName, password, twoFactorCode }, (err, sid) => {
        if (err) reject(err);
        else resolve(sid);
      });
    });
    console.log('[✓] 登录成功');
  } catch (err) {
    console.error('[✗] 登录失败:', describeError(err));
    if (db) await db.destroy();
    process.exit(1);
  }

  // Step 2: wait so the session settles
  console.log(`[2/3] 等待 ${delayMs}ms...`);
  await sleep(delayMs);

  // Step 3: edit persona name
  console.log('[3/3] 修改昵称...');
  try {
    await new Promise((resolve, reject) => {
      steam.editProfile({ name: nickname }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('[✓] 昵称修改成功:', nickname);
  } catch (err) {
    console.error('[✗] 修改昵称失败:', describeError(err));
    if (db) await db.destroy();
    process.exit(1);
  }

  // Optional: keep the DB nickname in sync (DB mode only)
  if (db && dbRow && opts['db-update'] !== false && dbRow.nickname !== nickname) {
    try {
      await db('accounts_simple').where('id', dbRow.id).update({ nickname, updated_at: new Date() });
      console.log('[✓] 已同步更新数据库 nickname 字段');
    } catch (e) {
      console.error('[!] 数据库更新失败(Steam 昵称已修改成功):', e.message);
    }
  }

  console.log('\n========================================');
  console.log('  Done.');
  console.log('========================================\n');

  if (db) await db.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n[✗] 未预期的错误:', describeError(err));
  process.exit(1);
});
