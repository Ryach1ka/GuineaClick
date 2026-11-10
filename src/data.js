// data.js — 静的データ（セリフ・ショップの品物・実績・定数）
// バランス調整は基本的にこのファイルだけで完結する（冬ごもり・カード・思い出ショップは run-data.js）

import { itemTags, tagInfo, cards, rarityWeight, winter, metaUnlocks } from './run-data.js';

export const data = {
  // 冬ごもり（寒波・おやつカード・思い出ショップ）
  itemTags, tagInfo, cards, rarityWeight, winter, metaUnlocks,

  // なでたときの吹き出しのセリフ
  words: ['プイプイ', 'ぷぅ〜', 'キュッキュッ', 'ブブブ…', 'わしゃわしゃ?'],
  // ごきげんタイム中のセリフ
  happyWords: ['ルンルン♪', 'プイプイプイ！', 'ごきげん〜', 'ポップコーン！'],
  // 夜じゃないとき（作戦タイム）になでたときのセリフ
  restWords: ['夜にそなえて…', 'ひとやすみ〜', 'ぬくぬく'],

  // 吹き出しを出す間隔（タップ何回ごとか）
  bubbleEvery: 5,

  // ショップの品物（上から順に解放される）
  //   click:  1個あたりのなでる力の増加量
  //   perSec: 1個あたりの毎秒の増加量
  //   herd:   true なら持っている数だけステージに仲間が出てくる
  //   meta:   思い出ショップでこれを買うまでショップに出てこない
  //   react:  買ったときのモルモットの反応（chew: もぐもぐ / friend: 仲間が来て大よろこび / pet: うっとり / decor: ステージに飾りが増える）
  //   lines:  買ったときのセリフ（ランダムで1つ）
  items: [
    { id: 'hay',     icon: '🌾', name: '牧草',         base: 25,   click: 1,    react: 'chew',   lines: ['もぐもぐ…', 'わらうまい！'] },
    { id: 'carrot',  icon: '🥕', name: 'にんじん',     base: 12,   perSec: 1,   react: 'chew',   lines: ['ポリポリ♪', 'にんじん！'] },
    { id: 'friend',  icon: '🐹', name: 'なかま',       base: 50,   perSec: 3,   react: 'friend', lines: ['プイプイ！', 'ともだち！'], herd: true },
    { id: 'cabbage', icon: '🥬', name: 'キャベツ',     base: 200,  click: 3,    react: 'chew',   lines: ['シャキシャキ！', 'ごちそう〜'] },
    { id: 'house',   icon: '🏠', name: 'おうち',       base: 250,  perSec: 10,  react: 'decor',  lines: ['おうちだ〜！', 'ひみつきち！'], meta: 'item_house' },
    { id: 'brush',   icon: '✨', name: 'ブラッシング', base: 800,  click: 10,   react: 'pet',    lines: ['ルルル…', 'つやつや〜'], meta: 'item_brush' },
    { id: 'garden',  icon: '🌳', name: 'ひろいお庭',   base: 1200, perSec: 40,  react: 'decor',  lines: ['おさんぽ！', 'お花いっぱい'], meta: 'item_garden' },
    { id: 'village', icon: '🏡', name: 'モルモット村', base: 4000, perSec: 150, react: 'decor',  lines: ['村ができた！', 'プイプイプイ！'], meta: 'item_village' }
  ],

  // 所持数がこの数に届いたら、お祝い演出
  milestones: [10, 25, 50, 100],

  // この夜までに集めたハートが「値段 × この割合」に届いたら品物が見えるようになる
  unlockRatio: 0.3,

  // 1個買うごとに値段が何倍になるか（短い時間で悩むよう、大きく上がる）
  costGrowth: 2.5,

  // 強化（一度だけ買える）。req を満たすとショップの上に出てくる
  //   req:    { item, owned } 品物の所持数 / { taps } なでた回数（累計） / { golden } きんのにんじんを拾った回数（累計）
  //   effect: { item, mult } その品物の効果が mult 倍
  //           { clickPctOfPerSec } タップに「毎秒の量 × この割合」が加わる
  //           { goldenWait } きんのにんじんが出るまでの時間が × この値
  //           { buffPlusMs } ごきげんタイムがこのミリ秒だけ長くなる
  upgrades: [
    { id: 'tap1',     icon: '👆', name: 'なでなで上手',     desc: 'タップに毎秒の10%が加わる', cost: 100, req: { taps: 150 },                 effect: { clickPctOfPerSec: 0.1 } },
    { id: 'gold1',    icon: '🥕', name: 'きんのにんじん畑', desc: 'きんのにんじんが出やすくなる', cost: 150, req: { golden: 3 },             effect: { goldenWait: 0.7 } },
    { id: 'carrot1',  icon: '🥕', name: 'あまいにんじん',   desc: 'にんじんの効果 ×1.5',     cost: 300,    req: { item: 'carrot', owned: 5 },   effect: { item: 'carrot', mult: 1.5 } },
    { id: 'gold2',    icon: '⏳', name: 'ごきげん長持ち',   desc: 'ごきげんタイム +4秒',     cost: 400,    req: { golden: 6 },                  effect: { buffPlusMs: 4000 } },
    { id: 'hay1',     icon: '🌾', name: 'お日さまの牧草',   desc: '牧草の効果 ×1.5',         cost: 625,    req: { item: 'hay', owned: 5 },      effect: { item: 'hay', mult: 1.5 } },
    { id: 'tap2',     icon: '👆', name: 'ゴッドハンドの心得', desc: 'タップに毎秒の20%が加わる', cost: 1000, req: { taps: 1500 },             effect: { clickPctOfPerSec: 0.2 } },
    { id: 'friend1',  icon: '🐹', name: 'なかよしの輪',     desc: 'なかまの効果 ×1.5',       cost: 1250,   req: { item: 'friend', owned: 5 },   effect: { item: 'friend', mult: 1.5 } },
    { id: 'carrot2',  icon: '🥕', name: '金時にんじん',     desc: 'にんじんの効果 ×1.5',     cost: 1440,   req: { item: 'carrot', owned: 8 },   effect: { item: 'carrot', mult: 1.5 } },
    { id: 'hay2',     icon: '🌾', name: '一番刈りチモシー', desc: '牧草の効果 ×1.5',         cost: 3000,   req: { item: 'hay', owned: 8 },      effect: { item: 'hay', mult: 1.5 } },
    { id: 'cabbage1', icon: '🥬', name: 'とれたてキャベツ', desc: 'キャベツの効果 ×1.5',     cost: 5000,   req: { item: 'cabbage', owned: 5 },  effect: { item: 'cabbage', mult: 1.5 } },
    { id: 'friend2',  icon: '🐹', name: '大家族',           desc: 'なかまの効果 ×1.5',       cost: 6000,   req: { item: 'friend', owned: 8 },   effect: { item: 'friend', mult: 1.5 } },
    { id: 'house1',   icon: '🏠', name: 'ふかふか床材',     desc: 'おうちの効果 ×1.5',       cost: 6250,   req: { item: 'house', owned: 5 },    effect: { item: 'house', mult: 1.5 } },
    { id: 'brush1',   icon: '✨', name: '獣毛ブラシ',       desc: 'ブラッシングの効果 ×1.5', cost: 20000,  req: { item: 'brush', owned: 5 },    effect: { item: 'brush', mult: 1.5 } },
    { id: 'cabbage2', icon: '🥬', name: '春キャベツ',       desc: 'キャベツの効果 ×1.5',     cost: 24000,  req: { item: 'cabbage', owned: 8 }, effect: { item: 'cabbage', mult: 1.5 } },
    { id: 'garden1',  icon: '🌳', name: '花壇づくり',       desc: 'ひろいお庭の効果 ×1.5',   cost: 30000,  req: { item: 'garden', owned: 5 },   effect: { item: 'garden', mult: 1.5 } },
    { id: 'house2',   icon: '🏠', name: '二階建て',         desc: 'おうちの効果 ×1.5',       cost: 30000,  req: { item: 'house', owned: 8 },    effect: { item: 'house', mult: 1.5 } },
    { id: 'brush2',   icon: '✨', name: 'プロのトリマー',   desc: 'ブラッシングの効果 ×1.5', cost: 96000,  req: { item: 'brush', owned: 8 },    effect: { item: 'brush', mult: 1.5 } },
    { id: 'village1', icon: '🏡', name: '村祭り',           desc: 'モルモット村の効果 ×1.5', cost: 100000, req: { item: 'village', owned: 5 },  effect: { item: 'village', mult: 1.5 } },
    { id: 'garden2',  icon: '🌳', name: '四季の庭',         desc: 'ひろいお庭の効果 ×1.5',   cost: 144000, req: { item: 'garden', owned: 8 },  effect: { item: 'garden', mult: 1.5 } },
    { id: 'village2', icon: '🏡', name: 'モルモット大祭',   desc: 'モルモット村の効果 ×1.5', cost: 480000, req: { item: 'village', owned: 8 }, effect: { item: 'village', mult: 1.5 } }
  ],

  // ステージに出てくる仲間の最大数
  maxHerd: 14,

  // きんのにんじん（夜のあいだにときどき出てくるボーナス）
  golden: {
    minWait: 15000,     // 次に出るまでの最短（ミリ秒）
    maxWait: 30000,     // 次に出るまでの最長（ミリ秒）
    stayMs: 6000,       // 出ている時間
    buffMs: 8000,       // ごきげんタイムの長さ
    buffMult: 5,        // ごきげんタイム中の倍率
    buffChance: 0.5,    // ごきげんタイムになる確率（残りは即ボーナス）
    instantSec: 10,     // 即ボーナス：毎秒の量 × この秒数
    instantClicks: 15,  // 即ボーナス：なでる力 × この回数（多いほうがもらえる）
    instantMin: 10      // 即ボーナスの最低量
  },

  // 実績（check が true を返したら解除）
  achievements: [
    { id: 'tap1',     name: 'はじめてのなでなで', desc: '1回なでる',                     check: (g) => g.stats.taps >= 1 },
    { id: 'tap100',   name: 'なでなで名人',       desc: '100回なでる',                   check: (g) => g.stats.taps >= 100 },
    { id: 'tap1000',  name: 'ゴッドハンド',       desc: '1000回なでる',                  check: (g) => g.stats.taps >= 1000 },
    { id: 'earn1k',   name: 'ハートいっぱい',     desc: 'ハートを合計1000個あつめる',    check: (g) => g.stats.earned >= 1000 },
    { id: 'earn10k',  name: 'ハートの山',         desc: 'ハートを合計1万個あつめる',     check: (g) => g.stats.earned >= 1e4 },
    { id: 'earn100k', name: 'ハートの海',         desc: 'ハートを合計10万個あつめる',    check: (g) => g.stats.earned >= 1e5 },
    { id: 'friend10', name: 'にぎやかケージ',     desc: '1回の冬でなかまを10匹にする',   check: (g) => g.ownedOf('friend') >= 10 },
    { id: 'rate100',  name: 'ハート工場',         desc: '毎秒100個（ごきげん抜き）',     check: (g) => g.basePerSec() >= 100 },
    { id: 'gold1',    name: 'きんのにんじん',     desc: 'きんのにんじんを拾う',          check: (g) => g.stats.golden >= 1 },
    { id: 'gold10',   name: '幸運のモルモット',   desc: 'きんのにんじんを10回拾う',      check: (g) => g.stats.golden >= 10 },
    { id: 'village',  name: '村長さん',           desc: 'モルモット村をつくる',          check: (g) => g.ownedOf('village') >= 1 },
    { id: 'upg1',     name: 'ひと工夫',           desc: '強化を1つ買う',                 check: (g) => g.upgradeCount() >= 1 },
    { id: 'card1',    name: 'おやつタイム',       desc: 'おやつカードを1枚えらぶ',       check: (g) => g.run.cards.length >= 1 },
    { id: 'night3',   name: '寒さに負けない',     desc: '3夜目を越える',                 check: (g) => g.meta.bestNights >= 3 },
    { id: 'clear1',   name: '冬ごもり成功',       desc: '5夜を越えて冬を越す',           check: (g) => g.meta.clears >= 1 },
    { id: 'games5',   name: 'なんどでも',         desc: '冬ごもりに5回挑戦する',         check: (g) => g.meta.games >= 5 }
  ],

  // 大きい数の単位（大きい順）
  units: [[1e16, '京'], [1e12, '兆'], [1e8, '億'], [1e4, '万']],

  // ステージの仲間の毛色（patch: ダッチ柄の白い帯があるか）
  coats: [
    { name: 'オレンジ×白', fur: '#d98c4a', ear: '#b97549', patch: true },
    { name: 'チョコ×白',   fur: '#76472d', ear: '#5c3624', patch: true },
    { name: 'クリーム',     fur: '#ead1a6', ear: '#d6a888', patch: false },
    { name: '黒×白',       fur: '#3a302c', ear: '#2b2320', patch: true },
    { name: 'グレー',       fur: '#9c948d', ear: '#7e756f', patch: false }
  ],

  // 生産の更新間隔（ミリ秒）と自動セーブの間隔（ミリ秒）
  tickMs: 100,
  autosaveMs: 5000
};
