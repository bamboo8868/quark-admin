import { BaseModel } from './base.model.js';
import { getDatabase } from '../config/database.js';
import SteamTotp from 'steam-totp';

export class RentGameAccountModel extends BaseModel {
  constructor() {
    super('rent_game_account');
  }

  async getAccountsWithFilters(filters = {}, page = 1, limit = 10) {
    const db = getDatabase();
    let query = db('rent_game_account as a')
      .leftJoin('rent_games as g', 'a.game_id', 'g.id')
      .select('a.*', 'g.name as game_name');

    if (filters.game_id) {
      query = query.where('a.game_id', filters.game_id);
    }
    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      query = query.where('a.status', filters.status);
    }
    if (filters.account) {
      query = query.where('a.account', 'like', `%${filters.account}%`);
    }

    const countQuery = query.clone().clearSelect();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const data = await query.orderBy('a.id', 'desc').limit(limit).offset(offset);

    // Generate TOTP code for each account using the shared_secret
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
