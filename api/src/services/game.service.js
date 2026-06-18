import { GameModel } from '../models/game.model.js';
import db from '../utils/db.js';

const gameModel = new GameModel();

/**
 * Game Service
 */
export const gameService = {
  async getGames(filters, page, limit) {
    return await gameModel.getGamesWithFilters(filters, page, limit);
  },

  async getGameById(id) {
    const game = await db('games as g')
      .leftJoin('game_category as gc', 'g.category_id', 'gc.id')
      .select('g.*', 'gc.name as category_name')
      .where('g.id', id)
      .first();
    if (game) {
      const tagIds = typeof game.tag_ids === 'string' ? JSON.parse(game.tag_ids) : (game.tag_ids || []);
      const allTags = await db('game_tag').select('id', 'name');
      const tagMap = {};
      allTags.forEach(t => { tagMap[t.id] = t.name; });
      game.tag_ids = tagIds;
      game.tag_names = tagIds.map(tid => tagMap[tid] || '').filter(Boolean);
    }
    return game;
  },

  async createGame(data) {
    // Convert tag_ids array to JSON string for MySQL
    const insertData = {
      ...data,
      tag_ids: Array.isArray(data.tag_ids) ? JSON.stringify(data.tag_ids) : data.tag_ids || '[]'
    };
    return await gameModel.create(insertData);
  },

  async updateGame(id, data) {
    // Convert tag_ids array to JSON string for MySQL
    const updateData = {
      ...data,
      tag_ids: Array.isArray(data.tag_ids) ? JSON.stringify(data.tag_ids) : data.tag_ids
    };
    return await gameModel.update(id, updateData);
  },

  async deleteGame(id) {
    return await gameModel.delete(id);
  },

  async batchDeleteGames(ids) {
    return await db('games').whereIn('id', ids).delete();
  }
};

export default gameService;
