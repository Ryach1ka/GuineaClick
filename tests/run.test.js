import { describe, it, expect } from 'vitest';
import { data } from '../src/data.js';
import { createGame } from '../src/game.js';
import { simulate } from './sim.js';

const meta = (id) => data.metaUnlocks.find((u) => u.id === id);
const N = data.winter.nights;

function setup({ count = 0, owned = {}, run = null, meta: m = null, rand = () => 0.5, time = 1000 } = {}) {
  const clock = { t: time };
  const g = createGame(data, { now: () => clock.t, random: rand });
  // run に phase がないと「前のバージョンのセーブ」扱いでリセットされるので、作戦タイムを補う
  g.init({ count, owned: { ...owned }, stats: { earned: 0 }, run: { phase: 'break', ...(run || {}) }, meta: m });
  return { g, clock };
}

// テスト用に、選択肢を経由せずカードを持たせる
const give = (g, ...ids) => { g.state.run.cards.push(...ids); };

describe('夜と作戦タイム', () => {
  it('新しい冬は1夜目の前の作戦タイムから始まる', () => {
    const { g } = setup();
    expect(g.run.phase).toBe('break');
    expect(g.run.night).toBe(1);
    expect(g.isNight()).toBe(false);
  });

  it('夜を始めると制限時間がはじまり、作戦タイムでは時間が進まない', () => {
    const { g } = setup({ owned: { carrot: 10 } });
    expect(g.update(5000)).toEqual([]);
    expect(g.state.count).toBe(0);
    expect(g.startNight()).toBe(true);
    expect(g.run.timeLeft).toBe(N[0].ms);
    g.update(1000);
    expect(g.run.timeLeft).toBe(N[0].ms - 1000);
    expect(g.state.count).toBe(10);
  });

  it('ノルマを払えたら次の夜の前の作戦タイムになり、おやつが1枚えらべる', () => {
    const { g } = setup();
    g.startNight();
    g.state.count = N[0].quota + 5;
    const ev = g.update(N[0].ms);
    expect(ev).toEqual([{ type: 'nightEnd', ok: true, night: 1, paid: N[0].quota }]);
    expect(g.state.count).toBe(5);
    expect(g.run.phase).toBe('break');
    expect(g.run.night).toBe(2);
    expect(g.run.pending).toBe(1);
  });

  it('ノルマに届いたら、残り時間を待たずに夜をおえられる', () => {
    const { g } = setup();
    g.startNight();
    g.state.count = N[0].quota - 1;
    expect(g.canEndEarly()).toBe(false);
    expect(g.endNightEarly()).toEqual([]);
    expect(g.run.phase).toBe('night');
    g.state.count = N[0].quota + 3;
    expect(g.canEndEarly()).toBe(true);
    expect(g.endNightEarly()[0]).toMatchObject({ type: 'nightEnd', ok: true, night: 1 });
    expect(g.state.count).toBe(3);
    expect(g.run.phase).toBe('break');
    expect(g.run.pending).toBe(1);
  });

  it('作戦タイムでは「夜をおえる」は使えない', () => {
    const { g } = setup({ count: 9999 });
    expect(g.canEndEarly()).toBe(false);
    expect(g.endNightEarly()).toEqual([]);
  });

  it('おやつを選ぶまで次の夜は始められない', () => {
    const { g } = setup({ run: { phase: 'break', night: 2, pending: 1 } });
    expect(g.startNight()).toBe(false);
    g.pickCard(g.getOffer()[0].id);
    expect(g.startNight()).toBe(true);
  });

  it('ノルマに足りなければ負けて、越えた夜の数だけ思い出がもらえる', () => {
    const { g } = setup({ run: { phase: 'night', night: 3, timeLeft: 1000 } });
    g.state.count = N[2].quota - 1;
    const ev = g.update(2000);
    expect(ev[0]).toMatchObject({ type: 'nightEnd', ok: false, night: 3 });
    expect(ev[1].result).toMatchObject({ win: false, nights: 2, memories: 2 });
    expect(g.run.phase).toBe('over');
    expect(g.meta.memories).toBe(2);
    expect(g.meta.games).toBe(1);
    expect(g.meta.bestNights).toBe(2);
  });

  it('最後の夜を越えるとクリアで、おまけの思い出がもらえる', () => {
    const last = N.length;
    const { g } = setup({ run: { phase: 'night', night: last, timeLeft: 10 } });
    g.state.count = N[last - 1].quota;
    const ev = g.update(100);
    expect(ev[1].result).toMatchObject({ win: true, nights: last, memories: last + data.winter.clearBonus });
    expect(g.run.phase).toBe('clear');
    expect(g.meta.clears).toBe(1);
  });

  it('新しい冬を始めると今の冬のものはリセット、思い出は残る', () => {
    const { g } = setup({ count: 999, owned: { hay: 3 }, run: { phase: 'over', cards: ['glutton'] }, meta: { memories: 7 } });
    g.newGame();
    expect(g.state.count).toBe(0);
    expect(g.state.owned).toEqual({});
    expect(g.run.cards).toEqual([]);
    expect(g.run.phase).toBe('break');
    expect(g.meta.memories).toBe(7);
  });

  it('長い夜・夜ふかしで夜がのびる', () => {
    const { g } = setup({ meta: { unlocks: { longnight: 2 } } });
    expect(g.nightMs(1)).toBe(N[0].ms + 10000);
    give(g, 'nightowl');
    expect(g.nightMs(1)).toBe(N[0].ms + 15000);
  });
});

describe('おやつカードのドラフト', () => {
  it('選択肢は重複なく3枚、持っているカードは出ない', () => {
    const { g } = setup({ run: { phase: 'break', pending: 1 }, rand: Math.random });
    give(g, 'glutton', 'hayfan');
    const offer = g.getOffer();
    expect(offer).toHaveLength(3);
    expect(new Set(offer.map((c) => c.id)).size).toBe(3);
    expect(offer.map((c) => c.id)).not.toContain('glutton');
  });

  it('選択肢はリロードしても変わらない（保存された offer を使う）', () => {
    const { g } = setup({ run: { phase: 'break', pending: 1 }, rand: Math.random });
    const a = g.getOffer().map((c) => c.id);
    expect(g.getOffer().map((c) => c.id)).toEqual(a);
  });

  it('引き直しは思い出ショップで買った回数だけ', () => {
    const { g } = setup({ run: { phase: 'break', pending: 1 } });
    expect(g.reroll()).toBe(false);
    g.meta.unlocks.reroll = 1;
    expect(g.reroll()).toBe(true);
    expect(g.reroll()).toBe(false);
  });

  it('よくばりを買うと選択肢が4枚', () => {
    const { g } = setup({ run: { phase: 'break', pending: 1 }, meta: { unlocks: { choice: 1 } }, rand: Math.random });
    expect(g.getOffer()).toHaveLength(4);
  });
});

describe('カードの効果', () => {
  const night = { phase: 'night', night: 1, timeLeft: 60000 };

  it('タグ指定：食いしん坊でたべもの系 ×1.5', () => {
    const { g } = setup({ owned: { carrot: 10, friend: 1 } });
    give(g, 'glutton');
    expect(g.basePerSec()).toBeCloseTo(10 * 1.5 + 3);
  });

  it('タグの枚数ボーナス：同じタグを重ねるほど全体が伸びる（シナジー）', () => {
    const { g } = setup({ owned: { carrot: 10 } });
    give(g, 'gourmet');
    expect(g.basePerSec()).toBeCloseTo(10 * 1.15);
    give(g, 'hayfan', 'carrotcult');
    expect(g.basePerSec()).toBeCloseTo(10 * 1.05 * 1.45);
  });

  it('群れの力：なかま1匹ごとにタップ +3%', () => {
    const { g } = setup({ owned: { hay: 99, friend: 10 } });
    expect(g.baseClick()).toBe(100);
    give(g, 'pack');
    expect(g.baseClick()).toBe(130);
  });

  it('子だくさん：なかまの値上がり率が下がる', () => {
    const { g } = setup({ owned: { friend: 5 } });
    const friend = data.items.find((i) => i.id === 'friend');
    const before = g.cost(friend);
    give(g, 'bigfamily');
    expect(g.cost(friend)).toBeLessThan(before);
  });

  it('ブラッシング職人：ドラッグでなでたときだけ ×3', () => {
    const { g } = setup({ owned: { hay: 9 }, run: night });
    give(g, 'brushpro');
    expect(g.pet()).toBe(10);
    expect(g.pet({ drag: true })).toBe(30);
  });

  it('とりひき：寝ぼすけは毎秒 ×2 でなでる力 ×0.5', () => {
    const { g } = setup({ owned: { hay: 19, carrot: 10 } });
    give(g, 'sleepy');
    expect(g.basePerSec()).toBeCloseTo(20);
    expect(g.baseClick()).toBe(10);
  });

  it('ポップコーン：ごきげんタイムの倍率 +3', () => {
    const { g } = setup({ rand: () => 0 });
    give(g, 'popcorn');
    g.claimGolden();
    expect(g.mult()).toBe(data.golden.buffMult + 3);
  });

  it('全カードの効果キーは game.js が知っているものだけ', () => {
    const known = ['tagMult', 'itemMult', 'perItemPerSec', 'tagCountGlobal', 'clickPerFriend', 'costGrowth',
      'dragMult', 'clickMult', 'perSecMult', 'clickPctOfPerSec', 'goldenWait', 'instantMult', 'buffMultPlus', 'nightPlusMs'];
    data.cards.forEach((c) => Object.keys(c.effect).forEach((k) => expect(known).toContain(k)));
    data.cards.forEach((c) => c.tags.forEach((t) => expect(data.tagInfo[t]).toBeTruthy()));
  });

  it('カードの id は重複していない', () => {
    const ids = data.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('思い出ショップ', () => {
  it('思い出が足りれば買えて、レベルが上がる', () => {
    const r = meta('reroll');
    const { g } = setup({ meta: { memories: r.cost[0] + 1 } });
    expect(g.buyMeta(r)).toBe(true);
    expect(g.metaLevel('reroll')).toBe(1);
    expect(g.metaCost(r)).toBe(r.cost[1]);
    expect(g.buyMeta(r)).toBe(false);
  });

  it('1回きりのものは2回買えない', () => {
    const { g } = setup({ meta: { memories: 100 } });
    expect(g.buyMeta(meta('starter'))).toBe(true);
    expect(g.metaCost(meta('starter'))).toBe(null);
    expect(g.buyMeta(meta('starter'))).toBe(false);
  });

  it('おすそわけ・おやつの前借りが次の冬に効く', () => {
    const { g } = setup({ meta: { unlocks: { starter: 1, early: 1 } } });
    g.newGame();
    expect(g.state.owned).toEqual({ hay: 2 });
    expect(g.run.pending).toBe(1);
  });

  it('思い出の力：1レベルごとに全体 +10%', () => {
    const { g } = setup({ owned: { carrot: 10 }, meta: { unlocks: { boost: 2 } } });
    expect(g.basePerSec()).toBeCloseTo(12);
  });
});

describe('前のバージョンからの引き継ぎ', () => {
  it('冬ごもりより前のセーブは、新しい冬から始める（思い出は残す）', () => {
    const g = createGame(data);
    g.init({ count: 3e6, owned: { hay: 40 }, stats: { earned: 3e6 }, run: { cards: ['glutton'], earned: 3e6 }, meta: { memories: 24 } });
    expect(g.state.count).toBe(0);
    expect(g.state.owned).toEqual({});
    expect(g.run.phase).toBe('break');
    expect(g.meta.memories).toBe(24);
    expect(g.stats.earned).toBe(3e6);
  });
});

// ---- バランス：ボットに遊ばせて、狙いどおりの難しさになっているかを見る ----
describe('バランス（ボットで12回ずつ遊ぶ）', () => {
  const avg = (opt) => {
    const rs = Array.from({ length: 12 }, (_, i) => simulate(data, { ...opt, seed: i + 1 }));
    return { nights: rs.reduce((a, r) => a + r.nights, 0) / rs.length, wins: rs.filter((r) => r.win).length };
  };

  it('なでるだけ（買い物しない）だと2夜目くらいで負ける', () => {
    expect(avg({ tapRate: 3, buy: false }).nights).toBeLessThanOrEqual(2.5);
  });

  it('最初の冬（思い出なし）は、うまく買い物しても3〜4夜目で力尽きる', () => {
    const r = avg({ tapRate: 3 });
    expect(r.nights).toBeGreaterThanOrEqual(2.5);
    expect(r.wins).toBeLessThanOrEqual(2);
  });

  it('思い出ショップをある程度そろえると、冬を越えられるようになる', () => {
    const r = avg({ tapRate: 3, meta: { item_house: 1, item_brush: 1, longnight: 2, boost: 2, starter: 1, early: 1 } });
    expect(r.wins).toBeGreaterThanOrEqual(8);
  });
});
