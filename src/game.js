// game.js — ゲームの状態と計算（画面には触らない）
// now / random を差し替えられるので、テストで時間や運を固定できる
//
// 冬ごもり：夜（制限時間）のあいだにハートを集め、夜の終わりにノルマ分を払う。
// 払えなければその冬は終わり。5夜を越えればクリア。越えた夜の数だけ思い出がもらえる。
//
// 状態は3つに分かれている
//   state: 今の冬のもの（ハート・品物・強化・おやつカード・何夜目か）。新しい冬でリセット
//   stats: ずっと残る記録（なでた回数・累計ハート・実績）
//   meta:  何回遊んでも残るもの（思い出・思い出ショップ・記録）

export function createGame(data, { now = Date.now, random = Math.random } = {}) {
  const W = data.winter;

  // phase: 'break'（作戦タイム。時間は止まっている） / 'night'（夜。時間が進む） / 'over'（負け） / 'clear'（冬を越えた）
  const newRun = () => ({
    phase: 'break',
    night: 1,           // 何夜目か（次に来る夜 / 今の夜）
    timeLeft: 0,        // 夜の残り時間（ミリ秒）
    playMs: 0,          // 夜を過ごした合計時間
    cards: [],          // 選んだおやつカードの id
    pending: 0,         // まだ選んでいないおやつの数
    offer: null,        // 今出ている選択肢（リロードで引き直せないよう保存する）
    earned: 0,          // この冬で集めたハート
    rerollsUsed: 0,
    result: null        // 終わったときの結果 { win, nights, memories, earned }
  });

  const state = {
    count: 0,      // 今のハート数
    owned: {},     // 品物ごとの所持数 { hay: 2, ... }
    upgrades: {},  // 買った強化 { hay1: true, ... }
    frac: 0,       // 自動生産の端数
    buffUntil: 0,  // ごきげんタイムが終わる時刻（保存しない）
    run: newRun()
  };

  const stats = {
    taps: 0,       // なでた回数（累計）
    earned: 0,     // これまでに稼いだハート（累計）
    golden: 0,     // きんのにんじんを拾った回数
    ach: {}        // 解除した実績 { tap1: true, ... }
  };

  const meta = {
    memories: 0,   // 思い出（思い出ショップで使う）
    unlocks: {},   // 思い出ショップで買ったもの { reroll: 2, ... }（数字はレベル）
    games: 0,      // 冬ごもりに挑戦した回数（終わった回数）
    clears: 0,     // 冬を越えた回数
    bestNights: 0, // いちばん多く越えた夜の数
    best: { earned: 0, perSec: 0 },
    history: []    // 最近の冬 [{ win, nights, earned, ms, memories, cards }]
  };

  const metaLevel = (id) => meta.unlocks[id] || 0;

  // 新しい冬の始まり（思い出ショップの効果をのせる）
  function freshRun() {
    state.count = 0;
    state.owned = metaLevel('starter') ? { hay: 2 } : {};
    state.upgrades = {};
    state.frac = 0;
    state.buffUntil = 0;
    state.run = newRun();
    if (metaLevel('early')) { state.run.pending = 1; }
  }

  function init(saved) {
    const s = saved.stats || {};
    stats.taps = s.taps || 0;
    stats.earned = typeof s.earned === 'number' ? s.earned : saved.count || 0;
    stats.golden = s.golden || 0;
    stats.ach = s.ach || {};
    Object.assign(meta, saved.meta || {});
    meta.best = Object.assign({ earned: 0, perSec: 0 }, meta.best);
    meta.history = meta.history || [];
    // 冬ごもりの形になっているセーブだけ続きから。それより前のセーブは新しい冬から始める
    if (saved.run && saved.run.phase) {
      state.count = saved.count;
      state.owned = saved.owned || {};
      state.upgrades = saved.upgrades || {};
      state.run = Object.assign(newRun(), saved.run);
    } else {
      freshRun();
    }
  }

  const ownedOf = (id) => state.owned[id] || 0;

  // ---- 思い出ショップ ----
  function metaCost(u) {
    const lv = metaLevel(u.id);
    if (Array.isArray(u.cost)) { return lv < u.cost.length ? u.cost[lv] : null; }
    return lv === 0 ? u.cost : null; // null = もう買えない
  }
  function buyMeta(u) {
    const c = metaCost(u);
    if (c == null || meta.memories < c) { return false; }
    meta.memories -= c;
    meta.unlocks[u.id] = metaLevel(u.id) + 1;
    return true;
  }

  // ---- おやつカードの効果をまとめる ----
  const ownedCards = () => state.run.cards.map((id) => data.cards.find((c) => c.id === id)).filter(Boolean);

  function mods() {
    const m = {
      tagCount: {}, tagMult: {}, itemMult: {}, perItemPerSec: {}, costGrowth: {},
      globalPct: 0, clickPerFriend: 0, dragMult: 1, clickMult: 1, perSecMult: 1,
      clickPctOfPerSec: 0, goldenWait: 1, instantMult: 1, buffMultPlus: 0, nightPlusMs: 0
    };
    const cs = ownedCards();
    cs.forEach((c) => c.tags.forEach((t) => { m.tagCount[t] = (m.tagCount[t] || 0) + 1; }));
    const mulInto = (dst, src) => Object.entries(src || {}).forEach(([k, v]) => { dst[k] = (dst[k] || 1) * v; });
    const addInto = (dst, src) => Object.entries(src || {}).forEach(([k, v]) => { dst[k] = (dst[k] || 0) + v; });
    cs.forEach(({ effect: e }) => {
      mulInto(m.tagMult, e.tagMult);
      mulInto(m.itemMult, e.itemMult);
      addInto(m.perItemPerSec, e.perItemPerSec);
      Object.assign(m.costGrowth, e.costGrowth);
      if (e.tagCountGlobal) { m.globalPct += e.tagCountGlobal.pct * (m.tagCount[e.tagCountGlobal.tag] || 0); }
      m.clickPerFriend += e.clickPerFriend || 0;
      m.dragMult *= e.dragMult || 1;
      m.clickMult *= e.clickMult || 1;
      m.perSecMult *= e.perSecMult || 1;
      m.clickPctOfPerSec += e.clickPctOfPerSec || 0;
      m.goldenWait *= e.goldenWait || 1;
      m.instantMult *= e.instantMult || 1;
      m.buffMultPlus += e.buffMultPlus || 0;
      m.nightPlusMs += e.nightPlusMs || 0;
    });
    return m;
  }

  // タップにも毎秒にもかかる全体倍率（カードのタグ数ボーナス × 思い出の力）
  const globalMult = (m = mods()) => (1 + m.globalPct) * (1 + 0.1 * metaLevel('boost'));

  // ---- 品物 ----
  const costGrowthOf = (item, m = mods()) => m.costGrowth[item.id] || data.costGrowth;
  const cost = (item) => Math.ceil(item.base * Math.pow(costGrowthOf(item), ownedOf(item.id)));

  // 思い出ショップで解放済みか（meta 指定のない品物は最初から）
  const isAvailable = (item) => !item.meta || metaLevel(item.meta) > 0;
  // ショップに見えるか（解放済みで、この冬にある程度ハートを集めたら）
  const isUnlocked = (item) => isAvailable(item) && (ownedOf(item.id) > 0 || state.run.earned >= item.base * data.unlockRatio);

  // ---- 強化 ----
  const hasUpgrade = (id) => !!state.upgrades[id];
  const boughtUpgrades = () => data.upgrades.filter((u) => state.upgrades[u.id]);
  const upgradeCount = () => boughtUpgrades().length;

  function reqMet(req) {
    if (req.item) { return ownedOf(req.item) >= req.owned; }
    if (req.taps) { return stats.taps >= req.taps; }
    if (req.golden) { return stats.golden >= req.golden; }
    return true;
  }
  // 条件を満たしていて、まだ買っていない強化（安い順）
  const availableUpgrades = () =>
    data.upgrades.filter((u) => !hasUpgrade(u.id) && reqMet(u.req)).sort((a, b) => a.cost - b.cost);

  function buyUpgrade(u) {
    if (!canShop() || hasUpgrade(u.id) || !reqMet(u.req) || state.count < u.cost) { return false; }
    state.count -= u.cost;
    state.upgrades[u.id] = true;
    return true;
  }

  // 品物ごとの倍率 = 強化 × カード（品物指定）× カード（タグ指定）
  function itemMult(id, m = mods()) {
    const fromUpg = boughtUpgrades().reduce((x, u) => (u.effect.item === id ? x * u.effect.mult : x), 1);
    return fromUpg * (m.itemMult[id] || 1) * (m.tagMult[data.itemTags[id]] || 1);
  }
  const clickPctOfPerSec = (m = mods()) =>
    boughtUpgrades().reduce((p, u) => p + (u.effect.clickPctOfPerSec || 0), 0) + m.clickPctOfPerSec;
  const goldenWaitMult = () => boughtUpgrades().reduce((x, u) => x * (u.effect.goldenWait || 1), 1) * mods().goldenWait;
  const buffMs = () => data.golden.buffMs + boughtUpgrades().reduce((s, u) => s + (u.effect.buffPlusMs || 0), 0);

  // 品物1個あたりの効果（強化・カード込み、全体倍率は含まない）
  const itemClick = (it) => (it.click || 0) * itemMult(it.id);
  const itemPerSec = (it) => (it.perSec || 0) * itemMult(it.id);

  // ごきげんタイム抜きの値
  function basePerSec(m = mods()) {
    const raw = data.items.reduce((r, it) => r + (it.perSec || 0) * itemMult(it.id, m) * ownedOf(it.id), 0);
    const perItem = 1 + Object.entries(m.perItemPerSec).reduce((p, [id, pct]) => p + pct * ownedOf(id), 0);
    return raw * m.perSecMult * perItem * globalMult(m);
  }
  function baseClick(m = mods()) {
    const raw = data.items.reduce((p, it) => p + (it.click || 0) * itemMult(it.id, m) * ownedOf(it.id), 1);
    const friends = 1 + m.clickPerFriend * ownedOf('friend');
    const v = raw * m.clickMult * friends * globalMult(m) + basePerSec(m) * clickPctOfPerSec(m);
    return Math.max(1, Math.floor(v));
  }

  const buffLeft = () => Math.max(0, state.buffUntil - now());
  const buffMult = () => data.golden.buffMult + mods().buffMultPlus;
  const mult = () => (buffLeft() > 0 ? buffMult() : 1);

  // ごきげんタイム込みの値
  const clickPower = () => baseClick() * mult();
  const perSec = () => basePerSec() * mult();

  function earn(n) {
    state.count += n;
    stats.earned += n;
    state.run.earned += n;
  }

  // ---- 夜と作戦タイム ----
  const isNight = () => state.run.phase === 'night';
  const isOver = () => state.run.phase === 'over' || state.run.phase === 'clear';
  const canShop = () => state.run.phase === 'night' || state.run.phase === 'break';
  const nightInfo = (n = state.run.night) => W.nights[Math.min(n, W.nights.length) - 1];
  const nightCount = () => W.nights.length;
  const quota = (n = state.run.night) => nightInfo(n).quota;
  const nightMs = (n = state.run.night) => nightInfo(n).ms + 5000 * metaLevel('longnight') + mods().nightPlusMs;

  // 作戦タイムから夜を始める（おやつを選び終わっていないと始められない）
  function startNight() {
    if (state.run.phase !== 'break' || state.run.pending > 0) { return false; }
    state.run.phase = 'night';
    state.run.timeLeft = nightMs();
    return true;
  }

  // 時間を進める（夜のあいだだけ）。起きたことの配列を返す
  //   { type: 'nightEnd', ok, night, paid } … 夜が終わってノルマを払えたか
  //   { type: 'gameEnd', result }           … 冬が終わった（負け / クリア）
  function update(ms) {
    const events = [];
    if (!isNight()) { return events; }
    const step = Math.min(ms, state.run.timeLeft);
    tick(step);
    state.run.timeLeft -= step;
    state.run.playMs += step;
    if (state.run.timeLeft <= 0) { events.push(...endNight()); }
    return events;
  }

  // ノルマに届いていれば、残り時間を待たずに夜をおえる（起きたことの配列を返す。届いていなければ空）
  const canEndEarly = () => isNight() && state.count >= quota();
  function endNightEarly() {
    if (!canEndEarly()) { return []; }
    return endNight();
  }

  function endNight() {
    const n = state.run.night;
    const q = quota(n);
    state.run.timeLeft = 0;
    state.buffUntil = 0;
    if (state.count < q) {
      state.run.phase = 'over';
      return [{ type: 'nightEnd', ok: false, night: n, paid: 0 }, { type: 'gameEnd', result: finish(false, n - 1) }];
    }
    state.count -= q;
    if (n >= nightCount()) {
      state.run.phase = 'clear';
      return [{ type: 'nightEnd', ok: true, night: n, paid: q }, { type: 'gameEnd', result: finish(true, n) }];
    }
    state.run.night = n + 1;
    state.run.phase = 'break';
    state.run.pending += 1;
    return [{ type: 'nightEnd', ok: true, night: n, paid: q }];
  }

  // 冬が終わった。思い出と記録をつける
  function finish(win, nights) {
    const memories = nights * W.memoriesPerNight + (win ? W.clearBonus : 0);
    const result = { win, nights, memories, earned: state.run.earned, ms: state.run.playMs, cards: state.run.cards.slice() };
    meta.memories += memories;
    meta.games += 1;
    if (win) { meta.clears += 1; }
    meta.bestNights = Math.max(meta.bestNights, nights);
    meta.best.earned = Math.max(meta.best.earned, result.earned);
    meta.best.perSec = Math.max(meta.best.perSec, basePerSec());
    meta.history = [result, ...meta.history].slice(0, 10);
    state.run.result = result;
    return result;
  }

  // 新しい冬を始める（終わったあとに呼ぶ）
  function newGame() {
    freshRun();
  }

  // この冬をあきらめる（越えた夜の分の思い出はもらえる）
  function giveUp() {
    if (isOver()) { return null; }
    state.run.phase = 'over';
    state.buffUntil = 0;
    return finish(false, state.run.night - 1);
  }

  // なでる。増えたハート数を返す（夜じゃないときは 0。drag: 体の上をドラッグしてなでた）
  function pet({ drag = false } = {}) {
    if (!isNight()) { return 0; }
    const gain = Math.floor(clickPower() * (drag ? mods().dragMult : 1));
    earn(gain);
    stats.taps += 1;
    return gain;
  }

  // 吹き出しを出すタイミングかどうか
  const shouldSpeak = () => stats.taps % data.bubbleEvery === 1;

  // 買う。買えたら true
  function buy(item) {
    if (!canShop() || !isAvailable(item)) { return false; }
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
      state.buffUntil = now() + buffMs();
      return { type: 'buff' };
    }
    const base = Math.max(basePerSec() * g.instantSec, baseClick() * g.instantClicks, g.instantMin);
    const amount = Math.ceil(base * mods().instantMult);
    earn(amount);
    return { type: 'instant', amount };
  }

  // ---- おやつカード（ドラフト） ----
  const choiceCount = () => W.baseChoices + (metaLevel('choice') ? 1 : 0);
  const rerollsLeft = () => W.baseRerolls + metaLevel('reroll') - state.run.rerollsUsed;

  // まだ持っていないカードから、レア度の重みつきで重複なく選ぶ
  function rollOffer() {
    const rareBoost = metaLevel('rare') ? 1.8 : 1;
    const weight = (c) => data.rarityWeight[c.rarity] * (c.rarity === 'rare' ? rareBoost : 1);
    const pool = data.cards.filter((c) => !state.run.cards.includes(c.id));
    const picked = [];
    while (picked.length < choiceCount() && pool.length) {
      const total = pool.reduce((s, c) => s + weight(c), 0);
      let r = random() * total;
      let i = 0;
      while (i < pool.length - 1 && r >= weight(pool[i])) { r -= weight(pool[i]); i += 1; }
      picked.push(pool.splice(i, 1)[0].id);
    }
    return picked;
  }

  // 今出ている選択肢（カードの配列）。選べるおやつがなければ null
  function getOffer() {
    if (state.run.pending <= 0) { return null; }
    if (!state.run.offer || !state.run.offer.length) { state.run.offer = rollOffer(); }
    if (!state.run.offer.length) { state.run.pending = 0; return null; } // 全部持っている
    return state.run.offer.map((id) => data.cards.find((c) => c.id === id)).filter(Boolean);
  }

  function pickCard(id) {
    if (state.run.pending <= 0 || !state.run.offer || !state.run.offer.includes(id)) { return false; }
    state.run.cards.push(id);
    state.run.pending -= 1;
    state.run.offer = null;
    return true;
  }

  function reroll() {
    if (state.run.pending <= 0 || rerollsLeft() <= 0) { return false; }
    state.run.rerollsUsed += 1;
    state.run.offer = rollOffer();
    return true;
  }

  // 新しく解除された実績の配列を返す
  function checkAchievements() {
    const got = data.achievements.filter((a) => !stats.ach[a.id] && a.check(api));
    got.forEach((a) => { stats.ach[a.id] = true; });
    return got;
  }

  const achievementCount = () => data.achievements.filter((a) => stats.ach[a.id]).length;

  const api = {
    state, stats, meta, init,
    get run() { return state.run; },
    ownedOf, cost, isAvailable, isUnlocked,
    baseClick, basePerSec, clickPower, perSec, mult, buffMult, buffLeft, buffMs,
    itemClick, itemPerSec, itemMult, mods, globalMult,
    hasUpgrade, upgradeCount, availableUpgrades, buyUpgrade, goldenWaitMult,
    pet, shouldSpeak, buy, tick, claimGolden,
    isNight, isOver, canShop, nightCount, quota, nightMs, startNight, update, newGame, giveUp, canEndEarly, endNightEarly,
    getOffer, pickCard, reroll, rerollsLeft, ownedCards,
    metaLevel, metaCost, buyMeta,
    checkAchievements, achievementCount
  };
  return api;
}
