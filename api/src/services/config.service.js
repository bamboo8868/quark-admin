import { ConfigCarouselModel } from '../models/configCarousel.model.js';
import { ConfigQaModel } from '../models/configQa.model.js';
import { ConfigAnnouncementModel } from '../models/configAnnouncement.model.js';
import { db } from '../utils/db.js';

const carouselModel = new ConfigCarouselModel();
const qaModel = new ConfigQaModel();
const announcementModel = new ConfigAnnouncementModel();

/** Normalize the config type: only 'rent' or 'offline' (default). */
const normalizeType = (t) => (t === 'rent' ? 'rent' : 'offline');

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
      type: normalizeType(data.type),
      title: data.title || '',
      image: data.image || '',
      link: data.link || '',
      sort: data.sort !== undefined && data.sort !== null && data.sort !== '' ? Number(data.sort) : 0,
      status: data.status !== undefined ? data.status : 1
    });
  },

  async updateCarousel(id, data) {
    const updateData = {};
    if (data.type !== undefined) updateData.type = normalizeType(data.type);
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
  async getEnabledCarousels(type = 'offline') {
    return await db('config_carousel')
      .where('status', 1)
      .where('type', normalizeType(type))
      .orderBy('sort', 'asc')
      .orderBy('id', 'asc');
  }
};

// ==================== Config QA (常见问题) ====================
export const qaService = {
  async getQas(filters, page, limit) {
    return await qaModel.getQasWithFilters(filters, page, limit);
  },

  async getQaById(id) {
    return await qaModel.findById(id);
  },

  async createQa(data) {
    return await qaModel.create({
      type: normalizeType(data.type),
      question: data.question || '',
      answer: data.answer || '',
      link: data.link || '',
      sort: data.sort !== undefined && data.sort !== null && data.sort !== '' ? Number(data.sort) : 0,
      status: data.status !== undefined ? data.status : 1
    });
  },

  async updateQa(id, data) {
    const updateData = {};
    if (data.type !== undefined) updateData.type = normalizeType(data.type);
    if (data.question !== undefined) updateData.question = data.question;
    if (data.answer !== undefined) updateData.answer = data.answer;
    if (data.link !== undefined) updateData.link = data.link;
    if (data.sort !== undefined && data.sort !== null && data.sort !== '') updateData.sort = Number(data.sort);
    if (data.status !== undefined) updateData.status = data.status;
    return await qaModel.update(id, updateData);
  },

  async deleteQa(id) {
    return await qaModel.delete(id);
  },

  /** Enabled QAs for the public web frontend, ordered by sort then id */
  async getEnabledQas(type = 'offline') {
    return await db('config_qa')
      .where('status', 1)
      .where('type', normalizeType(type))
      .orderBy('sort', 'asc')
      .orderBy('id', 'asc');
  }
};

// ==================== Config Announcement (公告) ====================
export const announcementService = {
  async getAnnouncements(filters, page, limit) {
    return await announcementModel.getAnnouncementsWithFilters(filters, page, limit);
  },

  async getAnnouncementById(id) {
    return await announcementModel.findById(id);
  },

  async createAnnouncement(data) {
    return await announcementModel.create({
      type: normalizeType(data.type),
      title: data.title || '',
      content: data.content || '',
      sort: data.sort !== undefined && data.sort !== null && data.sort !== '' ? Number(data.sort) : 0,
      status: data.status !== undefined ? data.status : 1
    });
  },

  async updateAnnouncement(id, data) {
    const updateData = {};
    if (data.type !== undefined) updateData.type = normalizeType(data.type);
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.sort !== undefined && data.sort !== null && data.sort !== '') updateData.sort = Number(data.sort);
    if (data.status !== undefined) updateData.status = data.status;
    return await announcementModel.update(id, updateData);
  },

  async deleteAnnouncement(id) {
    return await announcementModel.delete(id);
  },

  /** Enabled announcements for the public web frontend, ordered by sort then id */
  async getEnabledAnnouncements(type = 'offline') {
    return await db('config_announcement')
      .where('status', 1)
      .where('type', normalizeType(type))
      .orderBy('sort', 'asc')
      .orderBy('id', 'asc');
  }
};

// ==================== Config Setting (单值配置) ====================
export const settingService = {
  /** Read a single config value by key; returns '' when unset. */
  async getSetting(key) {
    const row = await db('config_setting').where('key', key).first();
    return row && row.value !== null && row.value !== undefined ? row.value : '';
  },

  /** Upsert a single config value by key. */
  async setSetting(key, value) {
    const val = value === undefined || value === null ? '' : String(value);
    const existing = await db('config_setting').where('key', key).first();
    if (existing) {
      await db('config_setting')
        .where('key', key)
        .update({ value: val, updated_at: new Date() });
    } else {
      await db('config_setting').insert({ key, value: val });
    }
    return val;
  },

  /** The global purchase link (购买链接). */
  async getPurchaseLink() {
    return await settingService.getSetting('purchase_link');
  },

  async setPurchaseLink(value) {
    return await settingService.setSetting('purchase_link', value);
  }
};
