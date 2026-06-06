import db from '../utils/db.js';

/**
 * Game Category Web Controller - public APIs for web project
 */
export const gameCategoryWebController = {
  /**
   * Get visible categories list (no pagination, all visible)
   * GET /web/game-categories
   */
  getCategories: async (request, reply) => {
    const list = await db('game_category')
      .where('visible', 1)
      .orderBy('sort_order', 'asc')
      .orderBy('id', 'desc')
      .select('id', 'name', 'icon', 'sort_order');

    return {
      code: 0,
      message: '操作成功',
      data: list
    };
  },

  /**
   * Get category by ID
   * GET /web/game-categories/:id
   */
  getCategoryById: async (request, reply) => {
    const { id } = request.params;
    const category = await db('game_category')
      .where('id', id)
      .where('visible', 1)
      .first();

    if (!category) {
      return {
        code: 10001,
        message: '分类不存在',
        data: null
      };
    }

    return {
      code: 0,
      message: '操作成功',
      data: category
    };
  }
};

export default gameCategoryWebController;
