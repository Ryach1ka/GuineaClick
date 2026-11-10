// data.js — 静的データ（セリフ・ショップの品物・実績・定数）
// バランス調整は基本的にこのファイルだけで完結する（周回まわりは run-data.js）

import { itemTags, tagInfo, cards, rarityWeight, draftThresholds, move, metaUnlocks } from './run-data.js';

export const data = {
  // 周回（お引っ越し）まわり
  itemTags, tagInfo, cards, rarityWeight, draftThresholds, move, metaUnlocks,

  // なでたときの吹き出しのセリフ
  words: ['プイプイ', 'ぷぅ〜', 'キュッキュッ', 'ブブブ…', 'わしゃわしゃ?'],
  // ごきげんタイム中のセリフ
  happyWords: ['ルンルン♪', 'プイプイプイ！', 'ごきげん〜', 'ポップコーン！'],

  // 吹き出しを出す間隔（タップ何回ごとか）
  bubbleEvery: 5,

  // ショップの品物（上から順に解放される）
  //   click:  1個あたりのなでる力の増加量
  //   perSec: 1個あたりの毎秒の増加量
  //   herd:   true なら持っている数だけステージに仲間が出てくる
  //   react:  買ったときのモルモットの反応（chew: もぐもぐ / friend: 仲間が来て大よろこび / pet: うっとり / decor: ステージに飾りが増える）
  //   lines:  買ったときのセリフ（ランダムで1つ）
  items: [
    { id: 'hay',     icon: '🌾', name: '牧草',         desc: 'なでる力 +1',  base: 15,     click: 1,     react: 'chew',   lines: ['もぐもぐ…', 'わらうまい！'] },
    { id: 'carrot',  icon: '🥕', name: 'にんじん',     desc: '毎秒 +1',      base: 30,     perSec: 1,    react: 'chew',   lines: ['ポリポリ♪', 'にんじん！'] },
    { id: 'friend',  icon: '🐹', name: 'なかま',       desc: '毎秒 +6',      base: 150,    perSec: 6,    react: 'friend', lines: ['プイプイ！', 'ともだち！'], herd: true },
    { id: 'cabbage', icon: '🥬', name: 'キャベツ',     desc: 'なでる力 +8',  base: 600,    click: 8,     react: 'chew',   lines: ['シャキシャキ！', 'ごちそう〜'] },
    { id: 'house',   icon: '🏠', name: 'おうち',       desc: '毎秒 +40',     base: 2000,   perSec: 40,   react: 'decor',  lines: ['おうちだ〜！', 'ひみつきち！'] },
    { id: 'brush',   icon: '✨', name: 'ブラッシング', desc: 'なでる力 +50', base: 9000,   click: 50,    react: 'pet',    lines: ['ルルル…', 'つやつや〜'] },
    { id: 'garden',  icon: '🌳', name: 'ひろいお庭',   desc: '毎秒 +260',    base: 30000,  perSec: 260,  react: 'decor',  lines: ['おさんぽ！', 'お花いっぱい'] },
    { id: 'village', icon: '🏡', name: 'モルモット村', desc: '毎秒 +1600',   base: 250000, perSec: 1600, react: 'decor',  lines: ['村ができた！', 'プイプイプイ！'] }
  ],

  // 所持数がこの数に届いたら、お祝い演出
  milestones: [10, 25, 50, 100, 200],

  // 強化（一度だけ買える）。req を満たすとショップの上に出てくる
  //   req:    { item, owned } 品物の所持数 / { taps } なでた回数 / { golden } きんのにんじんを拾った回数
  //   effect: { item, mult } その品物の効果が mult 倍
  //           { clickPctOfPerSec } タップに「毎秒の量 × この割合」が加わる
  //           { goldenWait } きんのにんじんが出るまでの時間が × この値
  //           { buffPlusMs } ごきげんタイムがこのミリ秒だけ長くなる
  upgrades: [
    { id: 'hay1',     icon: '🌾', name: 'お日さまの牧草',   desc: '牧草の効果 ×2',       cost: 600,     req: { item: 'hay', owned: 10 },     effect: { item: 'hay', mult: 2 } },
    { id: 'carrot1',  icon: '🥕', name: 'あまいにんじん',   desc: 'にんじんの効果 ×2',   cost: 1200,    req: { item: 'carrot', owned: 10 },  effect: { item: 'carrot', mult: 2 } },
    { id: 'tap1',     icon: '👆', name: 'なでなで上手',     desc: 'タップに毎秒の1%が加わる', cost: 2000, req: { taps: 200 },                effect: { clickPctOfPerSec: 0.01 } },
    { id: 'friend1',  icon: '🐹', name: 'なかよしの輪',     desc: 'なかまの効果 ×2',     cost: 6000,    req: { item: 'friend', owned: 10 },  effect: { item: 'friend', mult: 2 } },
    { id: 'hay2',     icon: '🌾', name: '一番刈りチモシー', desc: '牧草の効果 ×2',       cost: 15000,   req: { item: 'hay', owned: 25 },     effect: { item: 'hay', mult: 2 } },
    { id: 'gold1',    icon: '🥕', name: 'きんのにんじん畑', desc: 'きんのにんじんが出やすくなる', cost: 20000, req: { golden: 3 },          effect: { goldenWait: 0.7 } },
    { id: 'cabbage1', icon: '🥬', name: 'とれたてキャベツ', desc: 'キャベツの効果 ×2',   cost: 24000,   req: { item: 'cabbage', owned: 10 }, effect: { item: 'cabbage', mult: 2 } },
    { id: 'carrot2',  icon: '🥕', name: '金時にんじん',     desc: 'にんじんの効果 ×2',   cost: 30000,   req: { item: 'carrot', owned: 25 },  effect: { item: 'carrot', mult: 2 } },
    { id: 'house1',   icon: '🏠', name: 'ふかふか床材',     desc: 'おうちの効果 ×2',     cost: 80000,   req: { item: 'house', owned: 10 },   effect: { item: 'house', mult: 2 } },
    { id: 'gold2',    icon: '⏳', name: 'ごきげん長持ち',   desc: 'ごきげんタイム +10秒', cost: 80000,  req: { golden: 6 },                  effect: { buffPlusMs: 10000 } },
    { id: 'friend2',  icon: '🐹', name: '大家族',           desc: 'なかまの効果 ×2',     cost: 150000,  req: { item: 'friend', owned: 25 },  effect: { item: 'friend', mult: 2 } },
    { id: 'tap2',     icon: '👆', name: 'ゴッドハンドの心得', desc: 'タップに毎秒の3%が加わる', cost: 250000, req: { taps: 2000 },            effect: { clickPctOfPerSec: 0.03 } },
    { id: 'brush1',   icon: '✨', name: '獣毛ブラシ',       desc: 'ブラッシングの効果 ×2', cost: 360000, req: { item: 'brush', owned: 10 },   effect: { item: 'brush', mult: 2 } },
    { id: 'cabbage2', icon: '🥬', name: '春キャベツ',       desc: 'キャベツの効果 ×2',   cost: 600000,  req: { item: 'cabbage', owned: 25 }, effect: { item: 'cabbage', mult: 2 } },
    { id: 'garden1',  icon: '🌳', name: '花壇づくり',       desc: 'ひろいお庭の効果 ×2', cost: 1.2e6,   req: { item: 'garden', owned: 10 },  effect: { item: 'garden', mult: 2 } },
    { id: 'house2',   icon: '🏠', name: '二階建て',         desc: 'おうちの効果 ×2',     cost: 2e6,     req: { item: 'house', owned: 25 },   effect: { item: 'house', mult: 2 } },
    { id: 'brush2',   icon: '✨', name: 'プロのトリマー',   desc: 'ブラッシングの効果 ×2', cost: 9e6,   req: { item: 'brush', owned: 25 },   effect: { item: 'brush', mult: 2 } },
    { id: 'village1', icon: '🏡', name: '村祭り',           desc: 'モルモット村の効果 ×2', cost: 1e7,   req: { item: 'village', owned: 10 }, effect: { item: 'village', mult: 2 } },
    { id: 'garden2',  icon: '🌳', name: '四季の庭',         desc: 'ひろいお庭の効果 ×2', cost: 3e7,     req: { item: 'garden', owned: 25 },  effect: { item: 'garden', mult: 2 } },
    { id: 'village2', icon: '🏡', name: 'モルモット大祭',   desc: 'モルモット村の効果 ×2', cost: 2.5e8, req: { item: 'village', owned: 25 }, effect: { item: 'village', mult: 2 } }
  ],

  // オフライン報酬（ゲームを閉じていた間にもらえるハート）
  offline: {
    rate: 0.5,      // 毎秒の量に対する割合（閉じている間は半分）
    maxHours: 8,    // 何時間分までもらえるか
    minSec: 60      // これより短い不在では出さない
  },

  // これまでに稼いだハートが「値段 × この割合」に届いたら品物が見えるようになる
  unlockRatio: 0.5,

  // 1個買うごとに値段が何倍になるか
  costGrowth: 1.15,

  // ステージに出てくる仲間の最大数
  maxHerd: 14,

  // きんのにんじん（ときどき出てくるボーナス）
  golden: {
    minWait: 45000,     // 次に出るまでの最短（ミリ秒）
    maxWait: 110000,    // 次に出るまでの最長（ミリ秒）
    stayMs: 9000,       // 出ている時間
    buffMs: 20000,      // ごきげんタイムの長さ
    buffMult: 7,        // ごきげんタイム中の倍率
    buffChance: 0.5,    // ごきげんタイムになる確率（残りは即ボーナス）
    instantSec: 60,     // 即ボーナス：毎秒の量 × この秒数
    instantClicks: 30,  // 即ボーナス：なでる力 × この回数（多いほうがもらえる）
    instantMin: 50      // 即ボーナスの最低量
  },

  // 実績（check が true を返したら解除）
  achievements: [
    { id: 'tap1',     name: 'はじめてのなでなで', desc: '1回なでる',                    check: (g) => g.stats.taps >= 1 },
    { id: 'tap100',   name: 'なでなで名人',       desc: '100回なでる',                  check: (g) => g.stats.taps >= 100 },
    { id: 'tap1000',  name: 'ゴッドハンド',       desc: '1000回なでる',                 check: (g) => g.stats.taps >= 1000 },
    { id: 'earn1k',   name: 'ハートいっぱい',     desc: 'ハートを合計1000個あつめる',   check: (g) => g.stats.earned >= 1000 },
    { id: 'earn100k', name: 'ハートの山',         desc: 'ハートを合計10万個あつめる',   check: (g) => g.stats.earned >= 1e5 },
    { id: 'earn10m',  name: 'ハートの海',         desc: 'ハートを合計1000万個あつめる', check: (g) => g.stats.earned >= 1e7 },
    { id: 'friend10', name: 'にぎやかケージ',     desc: 'なかまを10匹にする',           check: (g) => g.ownedOf('friend') >= 10 },
    { id: 'rate1k',   name: 'ハート工場',         desc: '毎秒1000個（ごきげん抜き）',   check: (g) => g.basePerSec() >= 1000 },
    { id: 'gold1',    name: 'きんのにんじん',     desc: 'きんのにんじんを拾う',         check: (g) => g.stats.golden >= 1 },
    { id: 'gold10',   name: '幸運のモルモット',   desc: 'きんのにんじんを10回拾う',     check: (g) => g.stats.golden >= 10 },
    { id: 'village',  name: '村長さん',           desc: 'モルモット村をつくる',         check: (g) => g.ownedOf('village') >= 1 },
    { id: 'upg1',     name: 'ひと工夫',           desc: '強化を1つ買う',                check: (g) => g.upgradeCount() >= 1 },
    { id: 'upg10',    name: '工夫のかたまり',     desc: '強化を10個買う',               check: (g) => g.upgradeCount() >= 10 },
    { id: 'card1',    name: 'おやつタイム',       desc: 'おやつカードを1枚えらぶ',      check: (g) => g.run.cards.length >= 1 },
    { id: 'move1',    name: 'はじめてのお引っ越し', desc: '1回お引っ越しする',          check: (g) => g.meta.runs >= 1 },
    { id: 'move5',    name: '旅するモルモット',   desc: '5回お引っ越しする',            check: (g) => g.meta.runs >= 5 }
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

  // 自動生産の更新間隔（ミリ秒）と自動セーブの間隔（ミリ秒）
  tickMs: 100,
  autosaveMs: 5000
};
