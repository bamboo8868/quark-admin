#!/usr/bin/env node

/**
 * Change Steam Nickname Script (steam-user edition)
 *
 * Logs into Steam via the steam-user client protocol and changes the account's
 * persona name (nickname) using setPersona().
 *
 * Flow:
 *   logOn(accountName, password, twoFactorCode)
 *     → on 'loggedOn' → setPersona(Online, nickname)
 *     → wait → logOff()
 *
 * Usage:
 *   # DB mode — pull password + shared_secret(code) from accounts_simple
 *   node scripts/change-steam-nickname.js --id 1 --nickname "NewName"
 *   node scripts/change-steam-nickname.js --account someSteamUser --nickname "NewName"
 *   # DB mode — push the nickname already stored in the DB
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
import SteamUser from 'steam-user';
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

  // Generate the TOTP code from shared_secret
  let twoFactorCode;
  try {
    twoFactorCode = generateAuthCode(sharedSecret);
  } catch (e) {
    console.error('[✗] 生成验证码失败(shared_secret 可能无效):', e.message);
    if (db) await db.destroy();
    process.exit(1);
  }

  const client = new SteamUser({
    autoRelogin: false,   // Don't auto-relogin; we want a one-shot session
    machineName: 'nickname-script'
  });

  /**
   * Wrap the steam-user event flow in a single Promise so we can use async/await.
   * Resolves when the persona name has been set; rejects on login/protocol error.
   */
  const changeNickname = () =>
    new Promise((resolve, reject) => {
      let settled = false;
      const fail = (msg) => {
        if (settled) return;
        settled = true;
        reject(new Error(msg));
      };

      // Fatal login / protocol error
      client.on('error', (err) => {
        const eresult = err.eresult;
        const name = eresult !== undefined && SteamUser.EResult[eresult]
          ? SteamUser.EResult[eresult]
          : eresult;
        fail(`Steam 登录/协议错误: ${err.message}${name ? ` (EResult: ${name})` : ''}`);
      });

      // Steam Guard prompt — we already supply twoFactorCode, so this means it was wrong
      client.on('steamGuard', (domain, callback, lastCodeWrong) => {
        fail(lastCodeWrong
          ? 'Steam Guard 验证码错误 (twoFactorCode 无效或已过期)'
          : `Steam Guard 请求验证码 (domain=${domain}) — 脚本未提供，请检查 shared_secret`);
      });

      // Login succeeded
      client.on('loggedOn', (details) => {
        if (settled) return;
        console.log('[✓] 登录成功 (steamID:', details.client_supplied_steamid || client.steamID, ')');

        // Wait for the session to settle, then change the persona name
        console.log(`[2/3] 等待 ${delayMs}ms...`);
        setTimeout(() => {
          if (settled) return;
          console.log('[3/3] 修改昵称:', nickname);
          try {
            // Online state + new name. The name is what shows as the persona/nickname.
            client.setPersona(SteamUser.EPersonaState.Online, nickname);
          } catch (e) {
            fail(`setPersona 抛出异常: ${e.message}`);
            return;
          }

          // Give Steam a moment to process the change, then log off cleanly
          setTimeout(() => {
            if (settled) return;
            settled = true;
            try { client.logOff(); } catch (_) { /* ignore */ }
            resolve();
          }, 1500);
        }, delayMs);
      });

      // Step 1: initiate login
      console.log('[1/3] 登录 Steam (steam-user)...');
      try {
        client.logOn({
          accountName,
          password,
          twoFactorCode
        });
      } catch (e) {
        fail(`logOn 调用失败: ${e.message}`);
      }
    });

  try {
    await changeNickname();
    console.log('[✓] 昵称修改成功:', nickname);
  } catch (err) {
    console.error('[✗] 修改昵称失败:', describeError(err));
    try { client.logOff(); } catch (_) { /* ignore */ }
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
