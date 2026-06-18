import db from '../utils/db.js';

/**
 * Game Tag Web Controller - public APIs for web project
 */
export const gameTagWebController = {
  /**
   * Get all tags list
   * GET /web/game-tags
   */
  getTags: async (request, reply) => {
    const list = await db('game_tag')
      .orderBy('id', 'asc')
      .select('id', 'name');

    return {
      code: 0,
      message: '操作成功',
      data: list
    };
  }
};

export default gameTagWebController;
