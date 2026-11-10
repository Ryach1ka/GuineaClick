// save.js — localStorage への保存と読み込み
window.Guinea = window.Guinea || {};

Guinea.save = (function () {
  // 以前のバージョンと同じキーを使うので、今までのセーブデータはそのまま引き継がれる
  var KEY_COUNT = 'morumotto:count';
  var KEY_OWNED = 'morumotto:owned';

  function load() {
    var result = { count: 0, owned: {} };
    try {
      var saved = parseInt(localStorage.getItem(KEY_COUNT), 10);
      if (!isNaN(saved)) { result.count = saved; }
      result.owned = JSON.parse(localStorage.getItem(KEY_OWNED) || '{}') || {};
    } catch (e) {}
    return result;
  }

  function write(state) {
    try {
      localStorage.setItem(KEY_COUNT, String(state.count));
      localStorage.setItem(KEY_OWNED, JSON.stringify(state.owned));
    } catch (e) {}
  }

  return { load: load, write: write };
})();
