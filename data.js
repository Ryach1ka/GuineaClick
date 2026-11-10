// data.js — 静的データ（セリフ・ショップの品物・定数）
window.Guinea = window.Guinea || {};

Guinea.data = {
  // なでたときの吹き出しのセリフ
  words: ['プイプイ', 'ぷぅ〜', 'キュッキュッ', 'ブブブ…', 'わしゃわしゃ?'],

  // 吹き出しを出す間隔（タップ何回ごとか）
  bubbleEvery: 5,

  // ショップの品物
  //   click:  1個あたりのなでる力の増加量
  //   perSec: 1個あたりの毎秒の増加量
  items: [
    { id: 'hay',    name: '🌾 牧草',     desc: 'なでる力 +1', base: 15,  click: 1 },
    { id: 'carrot', name: '🥕 にんじん', desc: '毎秒 +1',     base: 30,  perSec: 1 },
    { id: 'friend', name: '🐹 なかま',   desc: '毎秒 +6',     base: 150, perSec: 6 }
  ],

  // 1個買うごとに値段が何倍になるか
  costGrowth: 1.15,

  // 自動生産の更新間隔（ミリ秒）と自動セーブの間隔（ミリ秒）
  tickMs: 100,
  autosaveMs: 5000
};
