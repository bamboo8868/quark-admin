import { gameService } from '../services/game.service.js';
import log from '../utils/logger.js';

/**
 * Game Controller
 */
export const gameController = {
  /**
   * Get games list
   * POST /games
   */
  getGames: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;

    const filters = {
      name: body.name,
      category_id: body.category_id,
      member_level: body.member_level
    };

    const result = await gameService.getGames(filters, page, limit);

    return {
      code: 0,
      message: '操作成功',
      data: result
    };
  },

  /**
   * Get game by ID
   * GET /games/:id
   */
  getGameById: async (request, reply) => {
    const { id } = request.params;
    const game = await gameService.getGameById(id);

    if (!game) {
      return {
        code: 10001,
        message: '游戏不存在',
        data: null
      };
    }

    return {
      code: 0,
      message: '操作成功',
      data: game
    };
  },

  /**
   * Create game
   * POST /games/create
   */
  createGame: async (request, reply) => {
    const game = await gameService.createGame(request.body);
    log.info(`[Game] Created game: ${game.name}`);

    return {
      code: 0,
      message: '操作成功',
      data: game
    };
  },

  /**
   * Update game
   * PUT /games/:id
   */
  updateGame: async (request, reply) => {
    const { id } = request.params;
    const game = await gameService.updateGame(id, request.body);
    log.info(`[Game] Updated game ID: ${id}`);

    return {
      code: 0,
      message: '操作成功',
      data: game
    };
  },

  /**
   * Delete game
   * DELETE /games/:id
   */
  deleteGame: async (request, reply) => {
    const { id } = request.params;
    await gameService.deleteGame(id);
    log.info(`[Game] Deleted game ID: ${id}`);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  },

  /**
   * Batch delete games
   * POST /games/batch-delete
   */
  batchDeleteGames: async (request, reply) => {
    const { ids } = request.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return {
        code: 10001,
        message: '请选择要删除的游戏',
        data: null
      };
    }

    await gameService.batchDeleteGames(ids);
    log.info(`[Game] Batch deleted games: ${ids.join(', ')}`);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  }
};
