// game.js — ゲームの状態と計算（画面には触らない）
// now / random を差し替えられるので、テストで時間や運を固定できる

export function createGame(data, { now = Date.now, random = Math.random } = {}) {
  const state = {
    count: 0,      // 今のハート数
    owned: {},     // 品物ごとの所持数 { hay: 2, ... }
    frac: 0,       // 自動生産の端数
    buffUntil: 0   // ごきげんタイムが終わる時刻（保存しない）
  };

  const stats = {
    taps: 0,       // なでた回数（累計）
    earned: 0,     // これまでに稼いだハート（累計）
    golden: 0,     // きんのにんじんを拾った回数
    ach: {}        // 解除した実績 { tap1: true, ... }
  };

  function init(saved) {
    state.count = saved.count;
    state.owned = saved.owned;
    const s = saved.stats || {};
    stats.taps = s.taps || 0;
    // 最初のバージョンのセーブには累計がないので、今のハート数から始める
    stats.earned = typeof s.earned === 'number' ? s.earned : saved.count;
    stats.golden = s.golden || 0;
    stats.ach = s.ach || {};
  }

  const ownedOf = (id) => state.owned[id] || 0;

  const cost = (item) => Math.ceil(item.base * Math.pow(data.costGrowth, ownedOf(item.id)));

  const isUnlocked = (item) => ownedOf(item.id) > 0 || stats.earned >= item.base * data.unlockRatio;

  // ごきげんタイム抜きの値
  const baseClick = () => data.items.reduce((p, it) => p + (it.click || 0) * ownedOf(it.id), 1);
  const basePerSec = () => data.items.reduce((r, it) => r + (it.perSec || 0) * ownedOf(it.id), 0);

  const buffLeft = () => Math.max(0, state.buffUntil - now());
  const mult = () => (buffLeft() > 0 ? data.golden.buffMult : 1);

  // ごきげんタイム込みの値
  const clickPower = () => baseClick() * mult();
  const perSec = () => basePerSec() * mult();

  function earn(n) {
    state.count += n;
    stats.earned += n;
  }

  // なでる。増えたハート数を返す
  function pet() {
    const gain = clickPower();
    earn(gain);
    stats.taps += 1;
    return gain;
  }

  // 吹き出しを出すタイミングかどうか
  const shouldSpeak = () => stats.taps % data.bubbleEvery === 1;

  // 買う。買えたら true
  function buy(item) {
    const c = cost(item);
    if (state.count < c) { return false; }
    state.count -= c;
    state.owned[item.id] = ownedOf(item.id) + 1;
    return true;
  }

  // 自動生産を ms ミリ秒分進める。増えたハート数を返す（0なら変化なし）
  function tick(ms) {
    const r = perSec();
    if (!r) { return 0; }
    state.frac += r * ms / 1000;
    // 0.1 を10回足すと 0.9999… になるような小数の誤差を吸収する
    const add = Math.floor(state.frac + 1e-9);
    if (add > 0) {
      earn(add);
      state.frac -= add;
    }
    return add;
  }

  // きんのにんじんを拾う
  function claimGolden() {
    const g = data.golden;
    stats.golden += 1;
    if (random() < g.buffChance) {
      state.buffUntil = now() + g.buffMs;
      return { type: 'buff' };
    }
    const amount = Math.ceil(Math.max(basePerSec() * g.instantSec, baseClick() * g.instantClicks, g.instantMin));
    earn(amount);
    return { type: 'instant', amount };
  }

  // 新しく解除された実績の配列を返す
  function checkAchievements() {
    const got = data.achievements.filter((a) => !stats.ach[a.id] && a.check(api));
    got.forEach((a) => { stats.ach[a.id] = true; });
    return got;
  }

  const achievementCount = () => data.achievements.filter((a) => stats.ach[a.id]).length;

  const api = {
    state, stats, init,
    ownedOf, cost, isUnlocked,
    baseClick, basePerSec, clickPower, perSec, mult, buffLeft,
    pet, shouldSpeak, buy, tick, claimGolden,
    checkAchievements, achievementCount
  };
  return api;
}
