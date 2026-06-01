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
    const game = await gameModel.findById(id);
    if (game) {
      game.tag_ids = typeof game.tag_ids === 'string' ? JSON.parse(game.tag_ids) : game.tag_ids;
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
