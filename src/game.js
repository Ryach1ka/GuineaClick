// game.js — ゲームの状態と計算（画面には触らない）
// now / random を差し替えられるので、テストで時間や運を固定できる
//
// 状態は3つに分かれている
//   state: この周回のもの（ハート・品物・強化・おやつカード）。お引っ越しでリセット
//   stats: ずっと残る記録（なでた回数・累計ハート・実績）
//   meta:  周回をまたいで残るもの（思い出・思い出ショップ・周回の記録）

export function createGame(data, { now = Date.now, random = Math.random } = {}) {
  const newRun = () => ({
    cards: [],          // 選んだおやつカードの id
    pending: 0,         // まだ選んでいないおやつの数
    offer: null,        // 今出ている選択肢（リロードで引き直せないよう保存する）
    earned: 0,          // この周で集めたハート
    startedAt: now(),
    draftIdx: 0,        // 次のおやつのしきい値の位置
    rerollsUsed: 0
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
    runs: 0,       // お引っ越しした回数
    best: { earned: 0, perSec: 0 },
    history: []    // 最近の周回 [{ earned, ms, memories, perSec, cards }]
  };

  function init(saved) {
    state.count = saved.count;
    state.owned = saved.owned;
    state.upgrades = saved.upgrades || {};
    const s = saved.stats || {};
    stats.taps = s.taps || 0;
    // 最初のバージョンのセーブには累計がないので、今のハート数から始める
    stats.earned = typeof s.earned === 'number' ? s.earned : saved.count;
    stats.golden = s.golden || 0;
    stats.ach = s.ach || {};
    // 周回の仕組みがなかった頃のセーブは、今までの分を「1周目」として続ける
    state.run = Object.assign(newRun(), saved.run || { earned: stats.earned });
    Object.assign(meta, saved.meta || {});
    meta.best = Object.assign({ earned: 0, perSec: 0 }, meta.best);
  }

  const ownedOf = (id) => state.owned[id] || 0;

  // ---- 思い出ショップ ----
  const metaLevel = (id) => meta.unlocks[id] || 0;
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
      clickPctOfPerSec: 0, goldenWait: 1, instantMult: 1, buffMultPlus: 0, offlineRate: null
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
      if (e.offlineRate != null) { m.offlineRate = Math.max(m.offlineRate || 0, e.offlineRate); }
    });
    return m;
  }

  // タップにも毎秒にもかかる全体倍率（カードのタグ数ボーナス × 思い出の力）
  const globalMult = (m = mods()) => (1 + m.globalPct) * (1 + 0.1 * metaLevel('boost'));

  // ---- 品物 ----
  const costGrowthOf = (item, m = mods()) => m.costGrowth[item.id] || data.costGrowth;
  const cost = (item) => Math.ceil(item.base * Math.pow(costGrowthOf(item), ownedOf(item.id)));

  const isUnlocked = (item) => ownedOf(item.id) > 0 || state.run.earned >= item.base * data.unlockRatio;

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
    if (hasUpgrade(u.id) || !reqMet(u.req) || state.count < u.cost) { return false; }
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
  const offlineRate = () => mods().offlineRate ?? data.offline.rate;

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

  // なでる。増えたハート数を返す（drag: 体の上をドラッグしてなでた）
  function pet({ drag = false } = {}) {
    const gain = Math.floor(clickPower() * (drag ? mods().dragMult : 1));
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
      state.buffUntil = now() + buffMs();
      return { type: 'buff' };
    }
    const base = Math.max(basePerSec() * g.instantSec, baseClick() * g.instantClicks, g.instantMin);
    const amount = Math.ceil(base * mods().instantMult);
    earn(amount);
    return { type: 'instant', amount };
  }

  // 閉じていた間のハートを計算して加える。もらった量を返す（短すぎる不在は 0）
  function applyOffline(awayMs) {
    const o = data.offline;
    if (!(awayMs >= o.minSec * 1000)) { return { amount: 0, ms: 0 }; }
    const ms = Math.min(awayMs, o.maxHours * 3600 * 1000);
    const amount = Math.floor(basePerSec() * (ms / 1000) * offlineRate());
    if (amount > 0) { earn(amount); }
    return { amount, ms };
  }

  // ---- おやつカード（ドラフト） ----
  const choiceCount = () => data.move.baseChoices + (metaLevel('choice') ? 1 : 0);
  const rerollsLeft = () => data.move.baseRerolls + metaLevel('reroll') - state.run.rerollsUsed;

  // しきい値を越えた分だけ、選べるおやつを増やす。増えた数を返す
  function checkDrafts() {
    let added = 0;
    const th = data.draftThresholds;
    while (state.run.draftIdx < th.length && state.run.earned >= th[state.run.draftIdx]) {
      state.run.draftIdx += 1;
      state.run.pending += 1;
      added += 1;
    }
    return added;
  }

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

  // ---- お引っ越し ----
  const memoriesFor = (earned) => Math.floor(data.move.memoryScale * Math.cbrt(Math.max(0, earned) / 1e6));
  const canMove = () => state.run.earned >= data.move.minEarned;

  function moveHouse() {
    if (!canMove()) { return null; }
    const gained = memoriesFor(state.run.earned);
    const record = {
      earned: state.run.earned,
      ms: now() - state.run.startedAt,
      memories: gained,
      perSec: basePerSec(),
      cards: state.run.cards.slice()
    };
    meta.memories += gained;
    meta.runs += 1;
    meta.best.earned = Math.max(meta.best.earned, record.earned);
    meta.best.perSec = Math.max(meta.best.perSec, record.perSec);
    meta.history = [record, ...meta.history].slice(0, 10);

    // この周のものをリセットして、思い出ショップの効果で新しい周を始める
    state.count = 0;
    state.owned = {};
    state.upgrades = {};
    state.frac = 0;
    state.buffUntil = 0;
    state.run = newRun();
    if (metaLevel('starter')) { state.owned = { hay: 5, carrot: 3 }; }
    if (metaLevel('early')) { state.run.pending = 1; }
    return record;
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
    ownedOf, cost, isUnlocked,
    baseClick, basePerSec, clickPower, perSec, mult, buffMult, buffLeft, buffMs, offlineRate,
    itemClick, itemPerSec, itemMult, mods, globalMult,
    hasUpgrade, upgradeCount, availableUpgrades, buyUpgrade, goldenWaitMult,
    pet, shouldSpeak, buy, tick, claimGolden, applyOffline,
    checkDrafts, getOffer, pickCard, reroll, rerollsLeft, ownedCards,
    memoriesFor, canMove, moveHouse,
    metaLevel, metaCost, buyMeta,
    checkAchievements, achievementCount
  };
  return api;
}
