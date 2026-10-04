import { AccountsSimpleModel } from '../models/accountsSimple.model.js';
import { db } from '../utils/db.js';
import { log } from '../utils/logger.js';
import SteamCommunity from 'steamcommunity';
import { generateAuthCode } from 'steam-totp';
import { AppError } from '../middlewares/error.middleware.js';

const accountsSimpleModel = new AccountsSimpleModel();


SteamCommunity.prototype.flushAll = async function (sessionID, cookies) {
  const post = (options) => new Promise((resolve, reject) => {
    this.httpRequestPost(options, (err, response, body) => {
      if (err) return reject(err);
      resolve({ response, body });
    });
  });

  try {
    await post({
      uri: 'https://store.steampowered.com/twofactor/manage_action',
      formData: {
        action: 'deauthorize',
        sessionid: sessionID
      }
    });
    console.log('flush success', sessionID);
  } catch (err) {
    console.log('flush err', err.message);
  }

  try {
    await post({
      uri: 'https://store.steampowered.com/logout',
      form: { sessionid: sessionID },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log('logout success');
  } catch (err) {
    console.log('logout error', err.message);
  }
};

/**
 * Accounts Simple Service - Business logic for game account management
 */
export const accountsSimpleService = {
  /**
   * Get accounts list with filters
   */
  async getAccounts(filters, page, limit) {
    return await accountsSimpleModel.getAccountsWithFilters(filters, page, limit);
  },

  /**
   * Get account by ID
   */
  async getAccountById(id) {
    return await accountsSimpleModel.findById(id);
  },

  /**
   * Create account
   */
  async createAccount(data) {
    return await accountsSimpleModel.create(data);
  },

  /**
   * Update account
   */
  async updateAccount(id, data) {
    return await accountsSimpleModel.update(id, data);
  },

  /**
   * Delete account
   */
  async deleteAccount(id) {
    return await accountsSimpleModel.delete(id);
  },

  /**
   * Batch delete accounts
   */
  async batchDeleteAccounts(ids) {
    for (const id of ids) {
      await accountsSimpleModel.delete(id);
    }
    return true;
  },

  /**
   * Import accounts from JSON data (upsert by account)
   * Mapping: account_name -> account, shared_secret -> code
   * If account already exists -> update code; otherwise -> insert
   */
  async importAccounts(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('导入数据不能为空');
    }

    const validItems = items.filter(item => item.account_name);

    if (validItems.length === 0) {
      throw new Error('未找到有效的 account_name 数据');
    }

    let inserted = 0;
    let updated = 0;

    for (const item of validItems) {
      const existing = await db('accounts_simple')
        .where('account', item.account_name)
        .first();

      const data = {
        code: item.shared_secret || '',
        visible: item.visible !== undefined ? item.visible : 1
      };

      if (existing) {
        await db('accounts_simple')
          .where('account', item.account_name)
          .update({ ...data, updated_at: new Date() });
        updated++;
      } else {
        await db('accounts_simple').insert({
          account: item.account_name,
          ...data
        });
        inserted++;
      }
    }

    log.info(`[GameAccount] Import done: ${inserted} inserted, ${updated} updated`);

    return {
      total: items.length,
      valid: validItems.length,
      inserted,
      updated,
      skipped: items.length - validItems.length
    };
  },

  async logout(id) {
    let accountInfo = await db('accounts_simple')
      .where('id', id)
      .first();

    console.log('accountInfo', accountInfo);
    if (!accountInfo?.password) throw new AppError('账号密码不存在');
    const code = generateAuthCode(accountInfo.code);
    console.log('code', code);
    const steamObj = new SteamCommunity();
    let sessionId;
    try {
      sessionId = await new Promise((resolve, reject) => {
        steamObj.login({
          accountName: accountInfo.account,
          password: accountInfo.password,
          twoFactorCode: code
        }, (err, sid) => {
          if (err) {
            console.log('login error', err);
            reject(err);
          } else {
            console.log('login success', sid);
            resolve(sid);
          }
        });
      });
    } catch (err) {
      console.log('STEAM login failed', err);
      throw new AppError('STEAM登录失败,请重试');
    }

    if (sessionId) {
      if (typeof sessionId === 'string' && sessionId.includes(';')) {
        sessionId = sessionId.split(';')[0];
      }
      console.log('flushing with sessionId:', sessionId);
      await steamObj.flushAll(sessionId);
    }

  },

  /**
   * Sync the stored nickname to the Steam account's persona name.
   * Logs into Steam with account + password + TOTP (from shared_secret),
   * then calls editProfile({ name }) to update the persona name.
   * Does NOT call flushAll (that would deauthorize the device).
   */
  async syncNickname(id) {
    const accountInfo = await db('accounts_simple')
      .where('id', id)
      .first();

    if (!accountInfo) throw new AppError('账号不存在');
    if (!accountInfo.password) throw new AppError('账号密码不存在，无法登录Steam');
    if (!accountInfo.nickname || !String(accountInfo.nickname).trim()) {
      throw new AppError('请先填写昵称再同步');
    }

    const nickname = String(accountInfo.nickname).trim();
    const code = generateAuthCode(accountInfo.code);
    const steamObj = new SteamCommunity();

    try {
      await new Promise((resolve, reject) => {
        steamObj.login({
          accountName: accountInfo.account,
          password: accountInfo.password,
          twoFactorCode: code
        }, (err, sid) => {
          if (err) reject(err);
          else resolve(sid);
        });
      });
    } catch (err) {
      log.error('[GameAccount] Steam login failed during syncNickname', err);
      throw new AppError('STEAM登录失败,请重试');
    }

    try {
      await new Promise((resolve, reject) => {
        steamObj.editProfile({ name: nickname }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch (err) {
      log.error('[GameAccount] editProfile failed during syncNickname', err);
      throw new AppError(`修改Steam昵称失败：${err.message}`);
    }

    log.info(`[GameAccount] Synced nickname for ${accountInfo.account} -> ${nickname}`);

    return {
      account: accountInfo.account,
      nickname
    };
  }
};

export default accountsSimpleService;
