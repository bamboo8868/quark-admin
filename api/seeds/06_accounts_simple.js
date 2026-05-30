/**
 * Seed data for accounts_simple table
 */
export async function seed(knex) {
  // Check if data already exists
  const rows = await knex('accounts_simple').select('id').limit(1);
  if (rows.length > 0) return;

  await knex('accounts_simple').insert([
    { account: 'cs2_pro_2024', code: 'Cs2@Pr0!Xk9', visible: 1 },
    { account: 'steam_cs2_vip', code: 'V1p#St3am!Zm', visible: 1 },
    { account: 'val_hero_main', code: 'H3r0!V4l@Qw', visible: 1 },
    { account: 'apex_legends_gl', code: 'L3g3nd@Ap3x!', visible: 1 },
    { account: 'apex_pred_rank', code: 'Pr3d@t0r#Xz', visible: 1 },
    { account: 'lol_diamond_01', code: 'D1a@L0L!M0b', visible: 1 },
    { account: 'lol_challenger', code: 'Ch4ll!L0L#Ng', visible: 0 },
    { account: 'dota2_immortal', code: '1mm0rt4l!Dt', visible: 1 },
    { account: 'elden_ring_souls', code: 'S0uls@Eld3n!', visible: 1 },
    { account: 'elden_ring_ng7', code: 'Ng7!R1ng#Fm', visible: 0 },
    { account: 'bg3_dnd_master', code: 'Dnd@Bg3!R0l3', visible: 1 },
    { account: 'cyber_night_v', code: 'N1ght@Cyb3r!', visible: 1 },
    { account: 'civ6_emperor', code: '3mp3r0r!Cv6', visible: 1 },
    { account: 'aoe4_khan_01', code: 'Kh4n@A0e4!Rt', visible: 0 },
    { account: 'fifa25_striker', code: 'Str1k3r@Ff4!', visible: 1 },
  ]);
}
