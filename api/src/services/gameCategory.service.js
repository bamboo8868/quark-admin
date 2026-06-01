import { GameCategoryModel } from '../models/gameCategory.model.js';

const gameCategoryModel = new GameCategoryModel();

/**
 * Game Category Service
 */
export const gameCategoryService = {
  async getCategories(filters, page, limit) {
    return await gameCategoryModel.getCategoriesWithFilters(filters, page, limit);
  },

  async getCategoryById(id) {
    return await gameCategoryModel.findById(id);
  },

  async createCategory(data) {
    return await gameCategoryModel.create(data);
  },

  async updateCategory(id, data) {
    return await gameCategoryModel.update(id, data);
  },

  async deleteCategory(id) {
    return await gameCategoryModel.delete(id);
  }
};

export default gameCategoryService;
