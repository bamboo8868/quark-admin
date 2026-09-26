import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';
import SteamTotp from 'steam-totp';

export class OfflineGameAccountModel extends BaseModel {
  constructor() {
    super('offline_game_account');
  }

  async getAccountsWithFilters(filters = {}, page = 1, limit = 10) {
    const db = getDatabase();
    let query = db('offline_game_account as a')
      .leftJoin('offline_games as g', 'a.game_id', 'g.id')
      .leftJoin('offline_game_version as v', 'a.version_id', 'v.id')
      .select(
        'a.*',
        'g.name as game_name',
        'v.name as version_name',
        db.raw('(select count(*) from offline_cdk c where c.account_id = a.id and c.status = 1) as bound_cdk_count')
      );

    if (filters.game_id) {
      query = query.where('a.game_id', filters.game_id);
    }
    if (filters.version_id) {
      query = query.where('a.version_id', filters.version_id);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('a.status', filters.status);
    }
    if (filters.account) {
      query = query.where('a.account', 'like', `%${filters.account}%`);
    }

    const countQuery = db('offline_game_account as a');
    if (filters.game_id) countQuery.where('a.game_id', filters.game_id);
    if (filters.version_id) countQuery.where('a.version_id', filters.version_id);
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      countQuery.where('a.status', filters.status);
    }
    if (filters.account) countQuery.where('a.account', 'like', `%${filters.account}%`);
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('a.id', 'desc').limit(limit).offset(offset);

    // Generate TOTP code for each account
    const list = data.map(account => {
      let totp_code = '';
      if (account.code) {
        try {
          totp_code = SteamTotp.generateAuthCode(account.code);
        } catch (e) {
          totp_code = '';
        }
      }
      return { ...account, totp_code };
    });

    return { list, total, pageSize: limit, currentPage: page };
  }
}
