// main.js — 入口。部品を組み立ててゲームを開始する

import './style.css';
import { data } from './data.js';
import { createStore } from './save.js';
import { createGame } from './game.js';
import { startUI } from './ui.js';

const store = createStore();
const game = createGame(data);
game.init(store.load());
const ui = startUI({ data, game, store });

// 開発中（npm run dev）だけ、コンソールから触れるようにする
//   例: guinea.ui.spawnGolden()  … きんのにんじんをすぐ出す
if (import.meta.env.DEV) {
  window.guinea = { data, game, store, ui };
}
