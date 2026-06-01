import { gameTagService } from '../services/gameTag.service.js';

/**
 * Game Tag Controller
 */
export const gameTagController = {
  /**
   * Get tags list
   * POST /game-tags
   */
  getTags: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 10;

    const filters = {
      name: body.name
    };

    const result = await gameTagService.getTags(filters, page, limit);

    return {
      code: 0,
      message: '操作成功',
      data: result
    };
  },

  /**
   * Get tag by ID
   * GET /game-tags/:id
   */
  getTagById: async (request, reply) => {
    const { id } = request.params;
    const tag = await gameTagService.getTagById(id);

    if (!tag) {
      return {
        code: 10001,
        message: '标签不存在',
        data: null
      };
    }

    return {
      code: 0,
      message: '操作成功',
      data: tag
    };
  },

  /**
   * Create tag
   * POST /game-tags/create
   */
  createTag: async (request, reply) => {
    const tag = await gameTagService.createTag(request.body);

    return {
      code: 0,
      message: '操作成功',
      data: tag
    };
  },

  /**
   * Update tag
   * PUT /game-tags/:id
   */
  updateTag: async (request, reply) => {
    const { id } = request.params;
    const tag = await gameTagService.updateTag(id, request.body);

    return {
      code: 0,
      message: '操作成功',
      data: tag
    };
  },

  /**
   * Delete tag
   * DELETE /game-tags/:id
   */
  deleteTag: async (request, reply) => {
    const { id } = request.params;
    await gameTagService.deleteTag(id);

    return {
      code: 0,
      message: '操作成功',
      data: null
    };
  }
};
