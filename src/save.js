// save.js — セーブデータの保存と読み込み
// storage を差し替えられるようにしてある（テストでは偽物、アプリ化したら端末の保存領域に）

// count / owned は最初のバージョンと同じキーなので、今までのセーブデータはそのまま引き継がれる
const KEY_COUNT = 'morumotto:count';
const KEY_OWNED = 'morumotto:owned';
const KEY_STATS = 'morumotto:stats';       // なでた回数・累計ハート・実績など
const KEY_SETTINGS = 'morumotto:settings'; // 音のオン/オフなど
const KEY_UPGRADES = 'morumotto:upgrades'; // 買った強化
const KEY_LAST_SEEN = 'morumotto:lastSeen'; // 最後に保存した時刻（オフライン報酬用）
const KEY_RUN = 'morumotto:run';           // この周回の状態（おやつカードなど）
const KEY_META = 'morumotto:meta';         // 周回をまたいで残るもの（思い出など）

function defaultStorage() {
  try { return window.localStorage; } catch (e) { return null; }
}

export function createStore(storage = defaultStorage(), { now = Date.now } = {}) {
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
    const lastSeen = parseInt(get(KEY_LAST_SEEN), 10);
    return {
      count: isNaN(count) ? 0 : count,
      owned: readJSON(KEY_OWNED) || {},
      upgrades: readJSON(KEY_UPGRADES) || {},
      stats: readJSON(KEY_STATS),
      run: readJSON(KEY_RUN),
      meta: readJSON(KEY_META),
      lastSeen: isNaN(lastSeen) ? null : lastSeen
    };
  }

  function write(game) {
    set(KEY_COUNT, String(game.state.count));
    set(KEY_OWNED, JSON.stringify(game.state.owned));
    set(KEY_UPGRADES, JSON.stringify(game.state.upgrades));
    set(KEY_STATS, JSON.stringify(game.stats));
    set(KEY_RUN, JSON.stringify(game.state.run));
    set(KEY_META, JSON.stringify(game.meta));
    set(KEY_LAST_SEEN, String(now()));
  }

  function loadSettings() {
    const s = readJSON(KEY_SETTINGS) || {};
    // sound: 効果音、bgm: BGM（どちらも最初はオン）。音量は 0〜1 で最初は 0.5
    const vol = (v) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : 0.5);
    return { sound: s.sound !== false, bgm: s.bgm !== false, sfxVol: vol(s.sfxVol), bgmVol: vol(s.bgmVol) };
  }

  function writeSettings(settings) {
    set(KEY_SETTINGS, JSON.stringify(settings));
  }

  return { load, write, loadSettings, writeSettings };
}
