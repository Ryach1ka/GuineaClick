import { describe, it, expect } from 'vitest';
import { data } from '../src/data.js';
import { createGame } from '../src/game.js';

const item = (id) => data.items.find((it) => it.id === id);
const upg = (id) => data.upgrades.find((u) => u.id === id);

// 時計と乱数を固定したゲームを作る。phase: 'night' なら夜の途中から始める
function setup({ count = 0, owned = {}, stats = null, meta = null, time = 1000, rand = 0.9, phase = 'night' } = {}) {
  const clock = { t: time };
  const g = createGame(data, { now: () => clock.t, random: () => rand });
  g.init({ count, owned: { ...owned }, stats, meta, run: { phase, night: 1, timeLeft: 60000 } });
  return { g, clock };
}

describe('なでる', () => {
  it('何も持っていなければ +1', () => {
    const { g } = setup();
    expect(g.pet()).toBe(1);
    expect(g.state.count).toBe(1);
    expect(g.stats.taps).toBe(1);
    expect(g.run.earned).toBe(1);
  });

  it('牧草とキャベツでなでる力が増える', () => {
    const { g } = setup({ owned: { hay: 3, cabbage: 2 } });
    expect(g.clickPower()).toBe(1 + 3 + 6);
  });

  it('作戦タイム（夜じゃないとき）はなでてもハートは増えない', () => {
    const { g } = setup({ phase: 'break' });
    expect(g.pet()).toBe(0);
    expect(g.state.count).toBe(0);
  });
});

describe('値段と購入', () => {
  it('1個目は基本の値段、買うたびに値上がり率ぶん高くなる（切り上げ）', () => {
    const { g } = setup({ count: 1000 });
    expect(g.cost(item('hay'))).toBe(25);
    g.buy(item('hay'));
    expect(g.cost(item('hay'))).toBe(Math.ceil(25 * data.costGrowth));
  });

  it('買えるとハートが減って所持数が増える', () => {
    const { g } = setup({ count: 20 });
    expect(g.buy(item('carrot'))).toBe(true);
    expect(g.state.count).toBe(8);
    expect(g.ownedOf('carrot')).toBe(1);
  });

  it('ハートが足りなければ買えず、何も変わらない', () => {
    const { g } = setup({ count: 11 });
    expect(g.buy(item('carrot'))).toBe(false);
    expect(g.state.count).toBe(11);
  });

  it('作戦タイムでも買い物はできる、冬が終わったらできない', () => {
    const a = setup({ count: 100, phase: 'break' }).g;
    expect(a.buy(item('carrot'))).toBe(true);
    const b = setup({ count: 100, phase: 'over' }).g;
    expect(b.buy(item('carrot'))).toBe(false);
  });

  it('思い出ショップで解放していない品物は買えない・出てこない', () => {
    const { g } = setup({ count: 1e6 });
    g.state.run.earned = 1e6;
    expect(g.isUnlocked(item('house'))).toBe(false);
    expect(g.buy(item('house'))).toBe(false);
    g.meta.unlocks.item_house = 1;
    expect(g.isUnlocked(item('house'))).toBe(true);
    expect(g.buy(item('house'))).toBe(true);
  });
});

describe('品物の解放', () => {
  it('この冬で集めたハートが値段の一定割合に届いたら見える', () => {
    const { g } = setup();
    const need = item('friend').base * data.unlockRatio;
    g.state.run.earned = need - 1;
    expect(g.isUnlocked(item('friend'))).toBe(false);
    g.state.run.earned = need;
    expect(g.isUnlocked(item('friend'))).toBe(true);
  });
});

describe('自動生産', () => {
  it('毎秒の量が積み上がる（端数も持ち越す）', () => {
    const { g } = setup({ owned: { carrot: 3 } }); // 毎秒3
    let total = 0;
    for (let i = 0; i < 10; i++) { total += g.tick(100); }
    expect(total).toBe(3);
    expect(g.state.count).toBe(3);
  });

  it('何も持っていなければ増えない', () => {
    const { g } = setup();
    expect(g.tick(1000)).toBe(0);
  });
});

describe('きんのにんじん', () => {
  it('ごきげんタイム中は倍率がかかり、時間が過ぎると戻る', () => {
    const { g, clock } = setup({ owned: { carrot: 2 }, rand: 0.1 });
    expect(g.claimGolden()).toEqual({ type: 'buff' });
    expect(g.perSec()).toBe(2 * data.golden.buffMult);
    expect(g.clickPower()).toBe(data.golden.buffMult);
    clock.t += data.golden.buffMs;
    expect(g.mult()).toBe(1);
  });

  it('即ボーナスは「毎秒×秒数」「なでる力×回数」「最低量」のいちばん多いもの', () => {
    const { g } = setup({ owned: { carrot: 10 }, rand: 0.9 });
    const r = g.claimGolden();
    expect(r).toEqual({ type: 'instant', amount: 10 * data.golden.instantSec });
    expect(g.stats.golden).toBe(1);
  });

  it('序盤でも最低量はもらえる', () => {
    const { g } = setup({ rand: 0.9 });
    expect(g.claimGolden().amount).toBe(Math.max(data.golden.instantMin, data.golden.instantClicks));
  });
});

describe('強化', () => {
  it('条件を満たすまで出てこない', () => {
    const { g } = setup({ owned: { carrot: 4 } });
    expect(g.availableUpgrades().map((u) => u.id)).not.toContain('carrot1');
    g.state.owned.carrot = 5;
    expect(g.availableUpgrades().map((u) => u.id)).toContain('carrot1');
  });

  it('品物の効果が倍率ぶん上がり、同じ品物の強化は掛け算で重なる', () => {
    const { g } = setup({ count: 1e6, owned: { carrot: 10 } });
    expect(g.basePerSec()).toBe(10);
    g.buyUpgrade(upg('carrot1'));
    expect(g.basePerSec()).toBeCloseTo(15);
    g.buyUpgrade(upg('carrot2'));
    expect(g.itemMult('carrot')).toBeCloseTo(2.25);
  });

  it('お金が足りない・買い済みなら買えない', () => {
    const u = upg('carrot1');
    const { g } = setup({ count: u.cost - 1, owned: { carrot: 5 } });
    expect(g.buyUpgrade(u)).toBe(false);
    g.state.count = u.cost;
    expect(g.buyUpgrade(u)).toBe(true);
    expect(g.state.count).toBe(0);
    g.state.count = u.cost;
    expect(g.buyUpgrade(u)).toBe(false);
  });

  it('なでなで上手：タップに毎秒の10%が加わる', () => {
    const { g } = setup({ count: 1e6, owned: { carrot: 100 }, stats: { taps: 150 } });
    g.buyUpgrade(upg('tap1'));
    expect(g.baseClick()).toBe(1 + 10);
  });

  it('ごきげん長持ち：ごきげんタイムがのびる', () => {
    const { g, clock } = setup({ count: 1e6, stats: { golden: 6 }, rand: 0.1 });
    g.buyUpgrade(upg('gold2'));
    g.claimGolden();
    clock.t += data.golden.buffMs + 3000;
    expect(g.mult()).toBe(data.golden.buffMult);
  });

  it('強化の id は重複していない', () => {
    const ids = data.upgrades.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('実績', () => {
  it('条件を満たした実績が1回だけ解除される', () => {
    const { g } = setup();
    g.pet();
    expect(g.checkAchievements().map((a) => a.id)).toEqual(['tap1']);
    expect(g.checkAchievements()).toEqual([]);
  });

  it('実績の id は重複していない', () => {
    const ids = data.achievements.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('データのチェック', () => {
  it('品物の id は重複しておらず、ノルマは夜ごとに上がる', () => {
    const ids = data.items.map((it) => it.id);
    expect(new Set(ids).size).toBe(ids.length);
    const q = data.winter.nights.map((n) => n.quota);
    for (let i = 1; i < q.length; i++) { expect(q[i]).toBeGreaterThan(q[i - 1]); }
  });

  it('品物の meta は思い出ショップに存在する', () => {
    data.items.filter((it) => it.meta).forEach((it) => {
      expect(data.metaUnlocks.map((u) => u.id)).toContain(it.meta);
    });
  });
});
