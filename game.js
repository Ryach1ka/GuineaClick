// game.js — ゲームの状態と計算（画面には触らない）
window.Guinea = window.Guinea || {};

Guinea.game = (function () {
  var data = Guinea.data;

  var state = {
    count: 0,   // 今のハート数
    owned: {},  // 品物ごとの所持数 { hay: 2, ... }
    frac: 0,    // 自動生産の端数
    taps: 0     // なでた回数（このプレイ中）
  };

  function init(saved) {
    state.count = saved.count;
    state.owned = saved.owned;
  }

  function ownedOf(id) { return state.owned[id] || 0; }

  function cost(item) {
    return Math.ceil(item.base * Math.pow(data.costGrowth, ownedOf(item.id)));
  }

  function clickPower() {
    var p = 1;
    data.items.forEach(function (it) { p += (it.click || 0) * ownedOf(it.id); });
    return p;
  }

  function perSec() {
    var r = 0;
    data.items.forEach(function (it) { r += (it.perSec || 0) * ownedOf(it.id); });
    return r;
  }

  // なでる。増えたハート数を返す
  function pet() {
    var gain = clickPower();
    state.count += gain;
    state.taps += 1;
    return gain;
  }

  // 吹き出しを出すタイミングかどうか
  function shouldSpeak() {
    return state.taps % data.bubbleEvery === 1;
  }

  // 買う。買えたら true
  function buy(item) {
    var c = cost(item);
    if (state.count < c) { return false; }
    state.count -= c;
    state.owned[item.id] = ownedOf(item.id) + 1;
    return true;
  }

  // 自動生産を1回分進める。増えたハート数を返す（0なら変化なし）
  function tick(ms) {
    var r = perSec();
    if (!r) { return 0; }
    state.frac += r * ms / 1000;
    var add = Math.floor(state.frac);
    if (add > 0) {
      state.count += add;
      state.frac -= add;
    }
    return add;
  }

  return {
    state: state,
    init: init,
    ownedOf: ownedOf,
    cost: cost,
    clickPower: clickPower,
    perSec: perSec,
    pet: pet,
    shouldSpeak: shouldSpeak,
    buy: buy,
    tick: tick
  };
})();
