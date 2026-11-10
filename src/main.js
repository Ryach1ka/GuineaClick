// main.js — 入口。部品を組み立ててゲームを開始する

import './style.css';
import { data } from './data.js';
import { createStore } from './save.js';
import { createGame } from './game.js';
import { startUI } from './ui.js';

const store = createStore();
const game = createGame(data);
const saved = store.load();
game.init(saved);
// 閉じていた間のハート（初回プレイなど lastSeen がないときは 0）
const offline = saved.lastSeen ? game.applyOffline(Date.now() - saved.lastSeen) : { amount: 0, ms: 0 };
const ui = startUI({ data, game, store, offline });

// 開発中（npm run dev）だけ、コンソールから触れるようにする
//   例: guinea.ui.spawnGolden()  … きんのにんじんをすぐ出す
if (import.meta.env.DEV) {
  window.guinea = { data, game, store, ui };
}
