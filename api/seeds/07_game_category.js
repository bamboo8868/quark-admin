/**
 * Seed data for game_category table
 */
export async function seed(knex) {
  const rows = await knex('game_category').select('id').limit(1);
  if (rows.length > 0) return;

  await knex('game_category').insert([
    { name: '射击游戏', icon: '🔫', sort_order: 1, visible: 1 },
    { name: 'MOBA', icon: '⚔️', sort_order: 2, visible: 1 },
    { name: '角色扮演', icon: '🧙', sort_order: 3, visible: 1 },
    { name: '策略游戏', icon: '🏰', sort_order: 4, visible: 1 },
    { name: '体育竞技', icon: '⚽', sort_order: 5, visible: 1 },
    { name: '竞速游戏', icon: '🏎️', sort_order: 6, visible: 1 },
    { name: '生存游戏', icon: '🏕️', sort_order: 7, visible: 1 },
    { name: '沙盒游戏', icon: '🌍', sort_order: 8, visible: 1 },
    { name: '恐怖游戏', icon: '👻', sort_order: 9, visible: 1 },
    { name: '模拟经营', icon: '🏭', sort_order: 10, visible: 1 },
    { name: '益智解谜', icon: '🧩', sort_order: 11, visible: 1 },
    { name: '动作冒险', icon: '🗺️', sort_order: 12, visible: 1 },
    { name: '格斗游戏', icon: '🥊', sort_order: 13, visible: 1 },
    { name: '音乐节奏', icon: '🎵', sort_order: 14, visible: 1 },
    { name: '卡牌游戏', icon: '🃏', sort_order: 15, visible: 1 },
    { name: 'VR游戏', icon: '🥽', sort_order: 16, visible: 1 },
    { name: '即时战略', icon: '⚔️', sort_order: 17, visible: 1 },
    { name: '动作RPG', icon: '🗡️', sort_order: 18, visible: 1 },
    { name: '平台跳跃', icon: '🏃', sort_order: 19, visible: 1 },
    { name: '冒险游戏', icon: '🌟', sort_order: 20, visible: 1 }
  ]);
}
