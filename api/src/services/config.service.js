import { ConfigCarouselModel } from '../models/configCarousel.model.js';
import { db } from '../utils/db.js';

const carouselModel = new ConfigCarouselModel();

// ==================== Config Carousel ====================
export const carouselService = {
  async getCarousels(filters, page, limit) {
    return await carouselModel.getCarouselsWithFilters(filters, page, limit);
  },

  async getCarouselById(id) {
    return await carouselModel.findById(id);
  },

  async createCarousel(data) {
    return await carouselModel.create({
      title: data.title || '',
      image: data.image || '',
      link: data.link || '',
      sort: data.sort !== undefined && data.sort !== null && data.sort !== '' ? Number(data.sort) : 0,
      status: data.status !== undefined ? data.status : 1
    });
  },

  async updateCarousel(id, data) {
    const updateData = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.image !== undefined) updateData.image = data.image;
    if (data.link !== undefined) updateData.link = data.link;
    if (data.sort !== undefined && data.sort !== null && data.sort !== '') updateData.sort = Number(data.sort);
    if (data.status !== undefined) updateData.status = data.status;
    return await carouselModel.update(id, updateData);
  },

  async deleteCarousel(id) {
    return await carouselModel.delete(id);
  },

  /** Enabled carousels for the public web frontend, ordered by sort then id */
  async getEnabledCarousels() {
    return await db('config_carousel')
      .where('status', 1)
      .orderBy('sort', 'asc')
      .orderBy('id', 'asc');
  }
};
