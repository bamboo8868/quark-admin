import { db } from '../utils/db.js';
import { log } from '../utils/logger.js';

/**
 * SDA Archive Service — 总SDA账号管理表 (sda_account)
 * Every SDA/maFile import saves the raw item content here, upserted by account_name.
 */
export const sdaArchiveService = {
  /**
   * Archive imported SDA items. Never throws — archiving must not break the import flow.
   * @param {Array} items parsed SDA file items ({ account_name, shared_secret, ... })
   * @param {string} source import module: game | game_mgr | offline | rent
   */
  async saveItems(items, source) {
    try {
      if (!Array.isArray(items) || items.length === 0) return;

      let saved = 0;
      for (const item of items) {
        const accountName = String(item.account_name || '').trim();
        if (!accountName) continue;

        const data = {
          shared_secret: String(item.shared_secret || ''),
          identity_secret: String(item.identity_secret || ''),
          content: JSON.stringify(item),
          source,
          updated_at: new Date()
        };

        const existing = await db('sda_account')
          .where('account_name', accountName)
          .first();

        if (existing) {
          await db('sda_account').where('id', existing.id).update(data);
        } else {
          await db('sda_account').insert({ account_name: accountName, ...data });
        }
        saved++;
      }

      log.info(`[SdaArchive] saved ${saved} items (source=${source})`);
    } catch (err) {
      log.error(`[SdaArchive] save failed (source=${source}): ${err.message}`);
    }
  },

  /**
   * Look up archived shared_secret by account name; returns '' when not found.
   * Never throws — lookup failure just means no auto-fill.
   * @param {string} accountName Steam account name
   * @returns {Promise<string>} shared_secret or ''
   */
  async getSecretByAccountName(accountName) {
    try {
      const name = String(accountName || '').trim();
      if (!name) return '';

      const row = await db('sda_account').where('account_name', name).first();
      return row ? String(row.shared_secret || '') : '';
    } catch (err) {
      log.error(`[SdaArchive] lookup failed: ${err.message}`);
      return '';
    }
  }
};