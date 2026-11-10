// run-data.js — 周回（お引っ越し）まわりのデータ：おやつカード・思い出ショップ・しきい値

// 品物のタグ（カードの「◯◯系」の対象）
export const itemTags = {
  hay: 'food', carrot: 'food', cabbage: 'food',
  friend: 'herd',
  brush: 'pet',
  house: 'home', garden: 'home', village: 'home'
};

export const tagInfo = {
  food:   { icon: '🥕', name: 'たべもの' },
  herd:   { icon: '🐹', name: 'なかま' },
  pet:    { icon: '👆', name: 'なでなで' },
  golden: { icon: '✨', name: 'きんにんじん' },
  home:   { icon: '🏠', name: 'おうち' },
  trade:  { icon: '⚖️', name: 'とりひき' }
};

// おやつカード
//   tags:   シナジーの対象。「◯◯カード1枚ごとに」系はこのタグを数える
//   rarity: common / rare（rare は出にくい）
//   effect: 効果。複数のカードの効果は game.js の mods() でまとめて計算する
//     tagMult:        { タグ: 倍率 }       そのタグの品物の効果が × 倍率
//     itemMult:       { 品物id: 倍率 }
//     perItemPerSec:  { 品物id: 割合 }     その品物1個ごとに毎秒全体 +割合
//     tagCountGlobal: { tag, pct }        そのタグのカード1枚ごとに全体（タップ・毎秒） +pct
//     clickPerFriend: 割合                なかま1匹ごとにタップ +割合
//     costGrowth:     { 品物id: 値 }       値上がり率をこの値にする
//     dragMult / clickMult / perSecMult: 倍率
//     clickPctOfPerSec: 割合              タップに毎秒の量 × 割合 が加わる
//     goldenWait / instantMult: 倍率      きんのにんじんの出やすさ / 即ボーナス
//     buffMultPlus: 数                    ごきげんタイムの倍率に足す
//     offlineRate: 割合                   オフライン報酬の割合を上書き
export const cards = [
  // 🥕 たべもの
  { id: 'glutton',   icon: '🍽️', name: '食いしん坊',     tags: ['food'],   rarity: 'common', desc: 'たべもの系の品物の効果 ×1.5',            effect: { tagMult: { food: 1.5 } } },
  { id: 'hayfan',    icon: '🌾', name: '牧草マニア',     tags: ['food'],   rarity: 'common', desc: '牧草の効果 ×3',                          effect: { itemMult: { hay: 3 } } },
  { id: 'carrotcult',icon: '🥕', name: 'にんじん教',     tags: ['food'],   rarity: 'rare',   desc: 'にんじん1個ごとに毎秒 +0.5%',            effect: { perItemPerSec: { carrot: 0.005 } } },
  { id: 'gourmet',   icon: '👑', name: 'グルメ',         tags: ['food'],   rarity: 'rare',   desc: '🥕カード1枚ごとに全体 +15%',             effect: { tagCountGlobal: { tag: 'food', pct: 0.15 } } },
  // 🐹 なかま
  { id: 'friendly',  icon: '🤝', name: 'なかよし',       tags: ['herd'],   rarity: 'common', desc: 'なかまの効果 ×2',                        effect: { itemMult: { friend: 2 } } },
  { id: 'bigfamily', icon: '👪', name: '子だくさん',     tags: ['herd'],   rarity: 'common', desc: 'なかまが値上がりしにくい',               effect: { costGrowth: { friend: 1.1 } } },
  { id: 'pack',      icon: '🐾', name: '群れの力',       tags: ['herd'],   rarity: 'rare',   desc: 'なかま1匹ごとにタップ +3%',              effect: { clickPerFriend: 0.03 } },
  { id: 'leader',    icon: '🎖️', name: 'リーダー',       tags: ['herd'],   rarity: 'rare',   desc: '🐹カード1枚ごとに全体 +15%',             effect: { tagCountGlobal: { tag: 'herd', pct: 0.15 } } },
  // 👆 なでなで
  { id: 'massage',   icon: '💆', name: 'マッサージ師',   tags: ['pet'],    rarity: 'common', desc: 'なでる力 ×1.5',                          effect: { clickMult: 1.5 } },
  { id: 'brushpro',  icon: '🪥', name: 'ブラッシング職人', tags: ['pet'],  rarity: 'common', desc: 'ドラッグでなでた効果 ×3',                effect: { dragMult: 3 } },
  { id: 'palm',      icon: '🖐️', name: 'ひだまりの手',   tags: ['pet'],    rarity: 'rare',   desc: 'タップに毎秒の5%が加わる',               effect: { clickPctOfPerSec: 0.05 } },
  { id: 'petmaster', icon: '🏅', name: 'なでなでの達人', tags: ['pet'],    rarity: 'rare',   desc: '👆カード1枚ごとに全体 +15%',             effect: { tagCountGlobal: { tag: 'pet', pct: 0.15 } } },
  // ✨ きんにんじん
  { id: 'luck',      icon: '🍀', name: '金運',           tags: ['golden'], rarity: 'common', desc: 'きんのにんじんがよく出る',               effect: { goldenWait: 0.6 } },
  { id: 'alchemy',   icon: '⚗️', name: '錬金術',         tags: ['golden'], rarity: 'common', desc: 'きんのにんじんの即ボーナス ×3',          effect: { instantMult: 3 } },
  { id: 'popcorn',   icon: '🍿', name: 'ポップコーン',   tags: ['golden'], rarity: 'rare',   desc: 'ごきげんタイムの倍率 +3',                effect: { buffMultPlus: 3 } },
  { id: 'star',      icon: '🌟', name: '幸運の星',       tags: ['golden'], rarity: 'rare',   desc: '✨カード1枚ごとに全体 +15%',             effect: { tagCountGlobal: { tag: 'golden', pct: 0.15 } } },
  // 🏠 おうち
  { id: 'cozy',      icon: '🛏️', name: 'ぬくぬく',       tags: ['home'],   rarity: 'common', desc: 'おうち系の品物の効果 ×1.5',              effect: { tagMult: { home: 1.5 } } },
  { id: 'architect', icon: '📐', name: '建築家',         tags: ['home'],   rarity: 'rare',   desc: '🏠カード1枚ごとに全体 +15%',             effect: { tagCountGlobal: { tag: 'home', pct: 0.15 } } },
  // ⚖️ とりひき（尖ったビルド用）
  { id: 'sleepy',    icon: '😴', name: '寝ぼすけ',       tags: ['trade'],  rarity: 'rare',   desc: '毎秒 ×2、でもなでる力 ×0.5',             effect: { perSecMult: 2, clickMult: 0.5 } },
  { id: 'eager',     icon: '🔥', name: 'はりきり',       tags: ['trade'],  rarity: 'rare',   desc: 'なでる力 ×3、でも毎秒 ×0.6',             effect: { clickMult: 3, perSecMult: 0.6 } },
  { id: 'housesit',  icon: '🏡', name: 'おるすばん上手', tags: ['trade'],  rarity: 'common', desc: 'オフライン報酬が 50% → 100%',            effect: { offlineRate: 1 } }
];

export const rarityWeight = { common: 60, rare: 30 };

// この周で集めたハートがこれを越えるたびに、おやつカードを1枚選べる
export const draftThresholds = [100, 1e3, 1e4, 5e4, 2e5, 1e6, 5e6, 2e7, 1e8, 5e8, 2e9, 1e10];

// お引っ越し
export const move = {
  minEarned: 1e6,            // この周でこれだけ集めたらお引っ越しできる
  memoryScale: 10,           // 思い出 = scale × (集めたハート / 100万) の立方根
  baseChoices: 3,            // おやつカードの選択肢の数
  baseRerolls: 0             // 1周あたりの引き直し回数
};

// 思い出ショップ（周回をまたいで残る）。level があるものは何回か買える
export const metaUnlocks = [
  { id: 'starter', icon: '🎁', name: '引っ越し祝い',     desc: '牧草5・にんじん3を持って周回を始める', cost: 10 },
  { id: 'reroll',  icon: '🔄', name: 'ひきなおし',       desc: '1周に1回、おやつカードを引き直せる（重ねがけ可）', cost: [15, 45, 120] },
  { id: 'early',   icon: '🍪', name: 'おやつの前借り',   desc: '周回の最初からおやつカードを1枚選べる', cost: 25 },
  { id: 'choice',  icon: '🃏', name: 'よくばり',         desc: 'おやつカードの選択肢が4枚になる', cost: 40 },
  { id: 'rare',    icon: '💎', name: 'めききの目',       desc: 'レアカードが出やすくなる', cost: 50 },
  { id: 'boost',   icon: '💗', name: '思い出の力',       desc: '全体 +10%（重ねがけ可）', cost: [20, 60, 150, 400] }
];
