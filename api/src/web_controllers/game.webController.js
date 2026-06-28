import db from '../utils/db.js';

/**
 * Game Web Controller - public APIs for web project
 */
export const gameWebController = {
  /**
   * Get games list with filters and pagination
   * POST /web/games
   */
  getGames: async (request, reply) => {
    const body = request.body || {};
    const page = body.page || 1;
    const limit = body.limit || 20;

    let query = db('games as g')
      .leftJoin('game_category as gc', 'g.category_id', 'gc.id');

    if (body.name) {
      query = query.where('g.name', 'like', `%${body.name}%`);
    }
    if (body.category_id !== undefined && body.category_id !== null && body.category_id !== '') {
      query = query.where('g.category_id', body.category_id);
    }
    if (body.member_level !== undefined && body.member_level !== null && body.member_level !== '') {
      query = query.where('g.member_level', '<=', body.member_level);
    }

    const countQuery = query.clone();
    const [{ count }] = await countQuery.count('* as count');
    const total = parseInt(count, 10);

    const offset = (page - 1) * limit;
    const list = await query
      .select(
        'g.id', 'g.name', 'g.desc', 'g.img_url',
        'g.category_id', 'g.tag_ids', 'g.member_level', 'g.detail_url',
        'gc.name as category_name'
      )
      .orderBy('g.id', 'desc')
      .limit(limit)
      .offset(offset);

    // Parse tag_ids JSON
    const parsedList = list.map(item => ({
      ...item,
      tag_ids: typeof item.tag_ids === 'string' ? JSON.parse(item.tag_ids) : item.tag_ids || []
    }));

    // Attach available account count for each game from rent_game_account table
    const listWithAccounts = await Promise.all(
      parsedList.map(async (game) => {
        const [{ available }] = await db('rent_game_account')
          .where('game_id', game.id)
          .where('status', 1)
          .count('* as available');
        return {
          ...game,
          account_count: parseInt(available, 10)
        };
      })
    );

    return {
      code: 0,
      message: '操作成功',
      data: {
        list: listWithAccounts,
        total,
        pageSize: limit,
        currentPage: page
      }
    };
  },

  /**
   * Get game detail by ID
   * GET /web/games/:id
   */
  getGameById: async (request, reply) => {
    const { id } = request.params;
    const game = await db('games as g')
      .leftJoin('game_category as gc', 'g.category_id', 'gc.id')
      .select(
        'g.*',
        'gc.name as category_name'
      )
      .where('g.id', id)
      .first();

    if (!game) {
      return {
        code: 10001,
        message: '游戏不存在',
        data: null
      };
    }

    game.tag_ids = typeof game.tag_ids === 'string' ? JSON.parse(game.tag_ids) : game.tag_ids || [];

    return {
      code: 0,
      message: '操作成功',
      data: game
    };
  }
};

export default gameWebController;
