/**
 * Seed data for member_games_simple table (会员简易游戏库)
 * code 为 Steam shared_secret(base32)，动态验证码由 steam-totp 实时生成
 */
export async function seed(knex) {
  const rows = await knex('member_games_simple').select('id').limit(1);
  if (rows.length > 0) return;

  await knex('member_games_simple').insert([
    { game_name: '黑神话：悟空', account: 'wukong_member_01', password: 'Wk#82mQv7Lp', code: 'JBSWY3DPEHPK3PXP', status: 1 },
    { game_name: '艾尔登法环', account: 'elden_ring_02', password: 'Er!5tYu9Kd', code: 'KRSXG5CTMVRXEZLU', status: 1 },
    { game_name: '赛博朋克2077', account: 'cyberpunk_03', password: 'Cp@77nBv3Xz', code: 'GEZDGNBVGY3TQOJQ', status: 1 },
    { game_name: '荒野大镖客2', account: 'rdr2_cowboy_04', password: 'Rd#2wEs6Hn', code: 'MFRGGZDFMZTWQ2LK', status: 1 },
    { game_name: '只狼：影逝二度', account: 'sekiro_shinobi_05', password: 'Sk!9qAz1Wm', code: 'ONXW4Z3JNUXGK43F', status: 1 },
    { game_name: '怪物猎人：世界', account: 'mhw_hunter_06', password: 'Mh@4rTf8Yc', code: 'JRXW4Z3JNUXGK43F', status: 1 },
    { game_name: '文明6', account: 'civ6_leader_07', password: 'Cv#6uIo2Pb', code: 'KRUGS4ZANFZSA3DB', status: 1 },
    { game_name: '星空', account: 'starfield_08', password: 'Sf!3eDx7Vn', code: 'EBTG643JNUXGK43F', status: 1 },
    { game_name: '博德之门3', account: 'bg3_tav_09', password: 'Bg@8gHj4Kl', code: 'IFBEGRCFIZDUQSKK', status: 1 },
    { game_name: '霍格沃茨之遗', account: 'hogwarts_10', password: 'Hw#5kLm9Qs', code: 'JBSWY3DPEHPK3PXQ', status: 1 }
  ]);
}
