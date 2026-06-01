import { GameTagModel } from '../models/gameTag.model.js';

const gameTagModel = new GameTagModel();

/**
 * Game Tag Service
 */
export const gameTagService = {
  async getTags(filters, page, limit) {
    return await gameTagModel.getTagsWithFilters(filters, page, limit);
  },

  async getTagById(id) {
    return await gameTagModel.findById(id);
  },

  async createTag(data) {
    return await gameTagModel.create(data);
  },

  async updateTag(id, data) {
    return await gameTagModel.update(id, data);
  },

  async deleteTag(id) {
    return await gameTagModel.delete(id);
  }
};

export default gameTagService;
