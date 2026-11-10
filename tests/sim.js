// sim.js — バランス確認用：ボットに冬ごもりを1回遊ばせて、何夜越えられたかを返す
//   tapRate: 1秒あたりのタップ回数
//   buy:     品物や強化を買うか（買う場合は「ノルマに必要な分を残しつつ、いちばん得なもの」を買う）
//   meta:    思い出ショップで買ってあるもの { item_house: 1, longnight: 1, ... }
//   cards:   おやつカードの選び方（'first' = 最初の1枚 / 'none' = 選ばない扱いで最初の1枚 ※ドラフトは必須）

import { createGame } from '../src/game.js';

export function simulate(data, { tapRate = 3, buy = true, meta = {}, seed = 1 } = {}) {
  let s = seed;
  const random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  let t = 0;
  const g = createGame(data, { now: () => t, random });
  g.init({ count: 0, owned: {}, stats: null, run: null, meta: { unlocks: { ...meta } } });

  const STEP = 100;
  const tapsPerStep = tapRate * STEP / 1000;
  let tapAcc = 0;

  // 1個買ったときに増える「1秒あたりのハート」
  const gainOf = (it) => (it.perSec ? g.itemPerSec(it) : 0) + (it.click ? g.itemClick(it) * tapRate : 0);

  function shop() {
    if (!buy) { return; }
    for (let guard = 0; guard < 50; guard++) {
      const r = g.run;
      // この夜の残りで稼げる見込みを引いた、払うために残しておく量
      const rate = g.basePerSec() + g.baseClick() * tapRate;
      const expect = r.phase === 'night' ? rate * (r.timeLeft / 1000) : rate * (g.nightMs() / 1000);
      const reserve = Math.max(0, g.quota() - expect * 0.9);
      const budget = g.state.count - reserve;
      const upg = g.availableUpgrades().find((u) => u.cost <= budget);
      if (upg) { g.buyUpgrade(upg); continue; }
      const cands = data.items.filter((it) => g.isAvailable(it) && g.cost(it) <= budget)
        .map((it) => ({ it, v: gainOf(it) / g.cost(it) }))
        .sort((a, b) => b.v - a.v);
      if (!cands.length) { return; }
      g.buy(cands[0].it);
    }
  }

  for (let safety = 0; safety < 100000; safety++) {
    const r = g.run;
    if (r.phase === 'over' || r.phase === 'clear') { break; }
    if (r.phase === 'break') {
      while (g.run.pending > 0) { const o = g.getOffer(); if (!o) { break; } g.pickCard(o[0].id); }
      shop();
      g.startNight();
      continue;
    }
    tapAcc += tapsPerStep;
    while (tapAcc >= 1) { g.pet(); tapAcc -= 1; }
    g.update(STEP);
    t += STEP;
    if (safety % 10 === 0) { shop(); }
  }
  const res = g.run.result || { nights: 0, win: false, earned: g.run.earned };
  return { nights: res.nights, win: res.win, earned: res.earned };
}
