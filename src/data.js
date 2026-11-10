// data.js — 静的データ（セリフ・ショップの品物・実績・定数）
// バランス調整は基本的にこのファイルだけで完結する

export const data = {
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
    { id: 'village',  name: '村長さん',           desc: 'モルモット村をつくる',         check: (g) => g.ownedOf('village') >= 1 }
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
