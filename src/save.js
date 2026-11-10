// save.js — セーブデータの保存と読み込み
// storage を差し替えられるようにしてある（テストでは偽物、アプリ化したら端末の保存領域に）

// count / owned は最初のバージョンと同じキーなので、今までのセーブデータはそのまま引き継がれる
const KEY_COUNT = 'morumotto:count';
const KEY_OWNED = 'morumotto:owned';
const KEY_STATS = 'morumotto:stats';       // なでた回数・累計ハート・実績など
const KEY_SETTINGS = 'morumotto:settings'; // 音のオン/オフなど

function defaultStorage() {
  try { return window.localStorage; } catch (e) { return null; }
}

export function createStore(storage = defaultStorage()) {
  function get(key) {
    try { return storage ? storage.getItem(key) : null; } catch (e) { return null; }
  }
  function set(key, value) {
    try { if (storage) { storage.setItem(key, value); } } catch (e) { /* 保存できない環境では何もしない */ }
  }
  function readJSON(key) {
    try { return JSON.parse(get(key) || 'null'); } catch (e) { return null; }
  }

  function load() {
    const count = parseInt(get(KEY_COUNT), 10);
    return {
      count: isNaN(count) ? 0 : count,
      owned: readJSON(KEY_OWNED) || {},
      stats: readJSON(KEY_STATS)
    };
  }

  function write(game) {
    set(KEY_COUNT, String(game.state.count));
    set(KEY_OWNED, JSON.stringify(game.state.owned));
    set(KEY_STATS, JSON.stringify(game.stats));
  }

  function loadSettings() {
    const s = readJSON(KEY_SETTINGS) || {};
    return { sound: s.sound === true };
  }

  function writeSettings(settings) {
    set(KEY_SETTINGS, JSON.stringify(settings));
  }

  return { load, write, loadSettings, writeSettings };
}
