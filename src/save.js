// save.js — セーブデータの保存と読み込み
// storage を差し替えられるようにしてある（テストでは偽物、アプリ化したら端末の保存領域に）

// count / owned は最初のバージョンと同じキーなので、今までのセーブデータはそのまま引き継がれる
const KEY_COUNT = 'morumotto:count';
const KEY_OWNED = 'morumotto:owned';
const KEY_STATS = 'morumotto:stats';       // なでた回数・累計ハート・実績など
const KEY_SETTINGS = 'morumotto:settings'; // 音のオン/オフなど
const KEY_UPGRADES = 'morumotto:upgrades'; // 買った強化
const KEY_RUN = 'morumotto:run';           // 今の冬の状態（何夜目・残り時間・おやつカードなど）
const KEY_META = 'morumotto:meta';         // 何回遊んでも残るもの（思い出など）

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
      upgrades: readJSON(KEY_UPGRADES) || {},
      stats: readJSON(KEY_STATS),
      run: readJSON(KEY_RUN),
      meta: readJSON(KEY_META)
    };
  }

  let wiped = false; // データを消したあとは、もう書き込まない（ページを閉じるときの自動セーブで書き戻さないように）

  function write(game) {
    if (wiped) { return; }
    set(KEY_COUNT, String(game.state.count));
    set(KEY_OWNED, JSON.stringify(game.state.owned));
    set(KEY_UPGRADES, JSON.stringify(game.state.upgrades));
    set(KEY_STATS, JSON.stringify(game.stats));
    set(KEY_RUN, JSON.stringify(game.state.run));
    set(KEY_META, JSON.stringify(game.meta));
  }

  function loadSettings() {
    const s = readJSON(KEY_SETTINGS) || {};
    // sound: 効果音、bgm: BGM（どちらも最初はオン）。音量は 0〜1 で最初は 0.5
    const vol = (v) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : 0.5);
    // seenHelp: 「あそびかた」を一度見たか
    return { sound: s.sound !== false, bgm: s.bgm !== false, sfxVol: vol(s.sfxVol), bgmVol: vol(s.bgmVol), seenHelp: s.seenHelp === true };
  }

  function writeSettings(settings) {
    set(KEY_SETTINGS, JSON.stringify(settings));
  }

  // ゲームのデータをすべて消す（音の設定は残す）。このあとは write しても何も書かない
  function wipe() {
    wiped = true;
    [KEY_COUNT, KEY_OWNED, KEY_STATS, KEY_UPGRADES, KEY_RUN, KEY_META, 'morumotto:lastSeen'].forEach((k) => {
      try { if (storage) { storage.removeItem(k); } } catch (e) { /* 何もしない */ }
    });
  }

  return { load, write, loadSettings, writeSettings, wipe };
}
