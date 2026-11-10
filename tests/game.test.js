import { describe, it, expect } from 'vitest';
import { data } from '../src/data.js';
import { createGame } from '../src/game.js';

const item = (id) => data.items.find((it) => it.id === id);

// 時計と乱数を固定したゲームを作る
function setup({ count = 0, owned = {}, stats = null, time = 1000, rand = 0.9 } = {}) {
  const clock = { t: time };
  const g = createGame(data, { now: () => clock.t, random: () => rand });
  g.init({ count, owned: { ...owned }, stats });
  return { g, clock };
}

describe('なでる', () => {
  it('何も持っていなければ +1', () => {
    const { g } = setup();
    expect(g.pet()).toBe(1);
    expect(g.state.count).toBe(1);
    expect(g.stats.taps).toBe(1);
    expect(g.stats.earned).toBe(1);
  });

  it('牧草とキャベツでなでる力が増える', () => {
    const { g } = setup({ owned: { hay: 3, cabbage: 2 } });
    expect(g.clickPower()).toBe(1 + 3 + 16);
  });
});

describe('値段と購入', () => {
  it('1個目は基本の値段、買うたびに1.15倍（切り上げ）', () => {
    const { g } = setup({ count: 1000 });
    expect(g.cost(item('hay'))).toBe(15);
    g.buy(item('hay'));
    expect(g.cost(item('hay'))).toBe(Math.ceil(15 * 1.15));
  });

  it('買えるとハートが減って所持数が増える', () => {
    const { g } = setup({ count: 40 });
    expect(g.buy(item('carrot'))).toBe(true);
    expect(g.state.count).toBe(10);
    expect(g.ownedOf('carrot')).toBe(1);
  });

  it('ハートが足りなければ買えず、何も変わらない', () => {
    const { g } = setup({ count: 29 });
    expect(g.buy(item('carrot'))).toBe(false);
    expect(g.state.count).toBe(29);
    expect(g.ownedOf('carrot')).toBe(0);
  });

  it('買い物では累計ハートは減らない', () => {
    const { g } = setup({ count: 100 });
    g.buy(item('carrot'));
    expect(g.stats.earned).toBe(100);
  });
});

describe('品物の解放', () => {
  it('この周で集めたハートが値段の半分に届いたら見える', () => {
    const { g } = setup({ stats: { earned: 74 } });
    expect(g.isUnlocked(item('friend'))).toBe(false);
    g.state.run.earned = 75;
    expect(g.isUnlocked(item('friend'))).toBe(true);
  });

  it('1個でも持っていれば見える', () => {
    const { g } = setup({ owned: { village: 1 } });
    expect(g.isUnlocked(item('village'))).toBe(true);
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
    expect(g.perSec()).toBe(2);
  });

  it('即ボーナスは「毎秒×60」「なでる力×30」「最低量」のいちばん多いもの', () => {
    const { g } = setup({ owned: { carrot: 10, hay: 1 }, rand: 0.9 });
    const r = g.claimGolden();
    expect(r).toEqual({ type: 'instant', amount: 600 });
    expect(g.state.count).toBe(600);
    expect(g.stats.golden).toBe(1);
  });

  it('序盤でも最低量はもらえる', () => {
    const { g } = setup({ rand: 0.9 });
    expect(g.claimGolden().amount).toBe(data.golden.instantMin);
  });
});

describe('実績', () => {
  it('条件を満たした実績が1回だけ解除される', () => {
    const { g } = setup();
    g.pet();
    expect(g.checkAchievements().map((a) => a.id)).toEqual(['tap1']);
    expect(g.checkAchievements()).toEqual([]);
    expect(g.achievementCount()).toBe(1);
  });

  it('実績の id は重複していない', () => {
    const ids = data.achievements.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

const upg = (id) => data.upgrades.find((u) => u.id === id);

describe('強化', () => {
  it('条件を満たすまで出てこない', () => {
    const { g } = setup({ owned: { hay: 9 } });
    expect(g.availableUpgrades().map((u) => u.id)).not.toContain('hay1');
    g.state.owned.hay = 10;
    expect(g.availableUpgrades().map((u) => u.id)).toContain('hay1');
  });

  it('品物の効果が2倍になる（タップ・毎秒）', () => {
    const { g } = setup({ count: 1e6, owned: { hay: 10, carrot: 10 } });
    expect(g.baseClick()).toBe(11);
    expect(g.buyUpgrade(upg('hay1'))).toBe(true);
    expect(g.baseClick()).toBe(21);
    g.buyUpgrade(upg('carrot1'));
    expect(g.basePerSec()).toBe(20);
    expect(g.itemPerSec(item('carrot'))).toBe(2);
  });

  it('同じ品物の強化は掛け算で重なる', () => {
    const { g } = setup({ count: 1e6, owned: { hay: 25 } });
    g.buyUpgrade(upg('hay1'));
    g.buyUpgrade(upg('hay2'));
    expect(g.itemMult('hay')).toBe(4);
  });

  it('お金が足りない・買い済みなら買えない', () => {
    const { g } = setup({ count: 599, owned: { hay: 10 } });
    expect(g.buyUpgrade(upg('hay1'))).toBe(false);
    g.state.count = 600;
    expect(g.buyUpgrade(upg('hay1'))).toBe(true);
    expect(g.state.count).toBe(0);
    g.state.count = 600;
    expect(g.buyUpgrade(upg('hay1'))).toBe(false);
    expect(g.availableUpgrades().map((u) => u.id)).not.toContain('hay1');
  });

  it('なでなで上手：タップに毎秒の1%が加わる', () => {
    const { g } = setup({ count: 1e6, owned: { carrot: 1000 }, stats: { taps: 200 } });
    g.buyUpgrade(upg('tap1'));
    expect(g.baseClick()).toBe(1 + 10);
  });

  it('ごきげん長持ち：ごきげんタイムが10秒のびる', () => {
    const { g, clock } = setup({ count: 1e6, stats: { golden: 6 }, rand: 0.1 });
    g.buyUpgrade(upg('gold2'));
    g.claimGolden();
    clock.t += data.golden.buffMs + 9000;
    expect(g.mult()).toBe(data.golden.buffMult);
  });

  it('強化の id は重複していない', () => {
    const ids = data.upgrades.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('オフライン報酬', () => {
  it('毎秒の量 × 時間 × 割合をもらえる', () => {
    const { g } = setup({ owned: { carrot: 10 } }); // 毎秒10
    const r = g.applyOffline(3600 * 1000);
    expect(r.amount).toBe(10 * 3600 * data.offline.rate);
    expect(g.state.count).toBe(r.amount);
  });

  it('上限時間を超えた分はもらえない', () => {
    const { g } = setup({ owned: { carrot: 10 } });
    const r = g.applyOffline(48 * 3600 * 1000);
    expect(r.ms).toBe(data.offline.maxHours * 3600 * 1000);
  });

  it('短い不在や時刻のずれでは何も起きない', () => {
    const { g } = setup({ owned: { carrot: 10 } });
    expect(g.applyOffline(10 * 1000).amount).toBe(0);
    expect(g.applyOffline(-5000).amount).toBe(0);
    expect(g.applyOffline(NaN).amount).toBe(0);
  });
});

describe('セーブの引き継ぎ', () => {
  it('最初のバージョンのセーブ（stats なし）は今のハート数を累計として使う', () => {
    const { g } = setup({ count: 5000, owned: { hay: 2 } });
    expect(g.stats.earned).toBe(5000);
    expect(g.stats.taps).toBe(0);
  });
});

describe('データのチェック', () => {
  it('品物の id は重複しておらず、値段は順に高くなる', () => {
    const ids = data.items.map((it) => it.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < data.items.length; i++) {
      expect(data.items[i].base).toBeGreaterThan(data.items[i - 1].base);
    }
  });
});
