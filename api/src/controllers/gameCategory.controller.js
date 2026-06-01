import { gameCategoryService } from '../services/gameCategory.service.js';

/**
 * Game Category Controller
 */
export const gameCategoryController = {
  /**
   * Get categories list
   * POST /game-categories
   */
  getCategories: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;

    const filters = {
      name: body.name,
      visible: body.visible
    };

    const result = await gameCategoryService.getCategories(filters, page, limit);

    return {
      code: 0,
      message: '操作成功',
      data: result
    };
  },

  /**
   * Get category by ID
   * GET /game-categories/:id
   */
  getCategoryById: async (request, reply) => {
    const { id } = request.params;
    const category = await gameCategoryService.getCategoryById(id);

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
  },

  /**
   * Create category
   * POST /game-categories/create
   */
  createCategory: async (request, reply) => {
    const category = await gameCategoryService.createCategory(request.body);

    return {
      code: 0,
      message: '操作成功',
      data: category
    };
  },

  /**
   * Update category
   * PUT /game-categories/:id
   */
  updateCategory: async (request, reply) => {
    const { id } = request.params;
    const category = await gameCategoryService.updateCategory(id, request.body);

    return {
      code: 0,
      message: '操作成功',
      data: category
    };
  },

  /**
   * Delete category
   * DELETE /game-categories/:id
   */
  deleteCategory: async (request, reply) => {
    const { id } = request.params;
    await gameCategoryService.deleteCategory(id);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  }
};
