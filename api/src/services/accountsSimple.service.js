import { AccountsSimpleModel } from '../models/accountsSimple.model.js';
import { db } from '../utils/db.js';
import { log } from '../utils/logger.js';
import SteamCommunity from 'steamcommunity';
import SteamTotp from 'steam-totp';

const accountsSimpleModel = new AccountsSimpleModel();


SteamCommunity.prototype.flushAll = function (sessionID, cookies) {
    this.httpRequestPost({
        "uri": "https://store.steampowered.com/twofactor/manage_action",
        "formData": {
            "action": 'deauthorize',
            "sessionid": sessionID
        },
    }, function (err, resposne, body) {
        // console.log(resposne);
        if (err) {
            console.log("flush err")
            // console.log(err);
        } else {
            console.log("flush success", sessionID)
            this.httpRequestPost({
                uri: 'https://store.steampowered.com/logout',
                form: {
                    sessionid: sessionID
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }, function (err) {
                if (err) {
                    console.log("logout error")
                } else {
                    console.log("logout success");
                }
            })

        }

    }
    )
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

    let code = SteamTotp.generateCode(accountInfo.code);
    let steamObj = new SteamCommunity();
    steamObj.login({
      accountName: accountInfo.account,
      password: accountInfo.password,
      twoFactorCode: code
    }, (err, sessionId) => {
      if (err) {
        console.log("login error", err);
        res.json({ code: 1, message: "STEAM登录错误" })
      } else {
        if (sessionId && typeof sessionId == 'string' && sessionId.includes(';')) {
          sessionId = sessionId.split(';')[0];
        }
        console.log("login success", sessionId);
        setTimeout(() => {
          steamObj.flushAll(sessionId);
        }, 1000);

        res.json({ code: 0, message: "success" })
      }

    })

  }
};

export default accountsSimpleService;
