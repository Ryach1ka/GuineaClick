import { describe, it, expect } from 'vitest';
import { data } from '../src/data.js';
import { createGame } from '../src/game.js';

const card = (id) => data.cards.find((c) => c.id === id);
const meta = (id) => data.metaUnlocks.find((u) => u.id === id);

// 乱数を順番に返す（足りなくなったら最後の値を使い続ける）
function seq(values) {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

function setup({ count = 0, owned = {}, run = null, meta: m = null, rand = () => 0.5, time = 1000 } = {}) {
  const clock = { t: time };
  const g = createGame(data, { now: () => clock.t, random: rand });
  g.init({ count, owned: { ...owned }, stats: { earned: 0 }, run, meta: m });
  return { g, clock };
}

// テスト用に、選択肢を経由せずカードを持たせる
const give = (g, ...ids) => { g.state.run.cards.push(...ids); };

describe('おやつカードのドラフト', () => {
  it('この周のハートがしきい値を越えるたびに選べる数が増える', () => {
    const { g } = setup();
    expect(g.checkDrafts()).toBe(0);
    g.state.run.earned = 1500;
    expect(g.checkDrafts()).toBe(2); // 100 と 1000
    expect(g.run.pending).toBe(2);
    expect(g.checkDrafts()).toBe(0);
  });

  it('選択肢は重複なく3枚、持っているカードは出ない', () => {
    const { g } = setup({ run: { pending: 1 }, rand: Math.random });
    give(g, 'glutton', 'hayfan');
    const offer = g.getOffer();
    expect(offer).toHaveLength(3);
    expect(new Set(offer.map((c) => c.id)).size).toBe(3);
    expect(offer.map((c) => c.id)).not.toContain('glutton');
  });

  it('選択肢はリロードしても変わらない（保存された offer を使う）', () => {
    const { g } = setup({ run: { pending: 1 }, rand: Math.random });
    const a = g.getOffer().map((c) => c.id);
    expect(g.getOffer().map((c) => c.id)).toEqual(a);
  });

  it('選んだカードが手に入り、選べる数が減る', () => {
    const { g } = setup({ run: { pending: 2 } });
    const [first] = g.getOffer();
    expect(g.pickCard(first.id)).toBe(true);
    expect(g.run.cards).toEqual([first.id]);
    expect(g.run.pending).toBe(1);
    expect(g.pickCard('not-offered')).toBe(false);
  });

  it('引き直しは思い出ショップで買った回数だけ', () => {
    const { g } = setup({ run: { pending: 1 } });
    expect(g.reroll()).toBe(false);
    g.meta.unlocks.reroll = 1;
    expect(g.reroll()).toBe(true);
    expect(g.reroll()).toBe(false);
  });

  it('よくばりを買うと選択肢が4枚', () => {
    const { g } = setup({ run: { pending: 1 }, meta: { unlocks: { choice: 1 } }, rand: Math.random });
    expect(g.getOffer()).toHaveLength(4);
  });
});

describe('カードの効果', () => {
  it('タグ指定：食いしん坊でたべもの系 ×1.5', () => {
    const { g } = setup({ owned: { carrot: 10, friend: 1 } });
    give(g, 'glutton');
    expect(g.basePerSec()).toBeCloseTo(10 * 1.5 + 6);
  });

  it('タグの枚数ボーナス：同じタグを重ねるほど全体が伸びる（シナジー）', () => {
    const { g } = setup({ owned: { carrot: 10 } });
    give(g, 'gourmet');
    expect(g.basePerSec()).toBeCloseTo(10 * 1.15);          // グルメ自身で1枚
    give(g, 'hayfan', 'carrotcult');
    // 🥕カード3枚 → +45%、にんじん教でにんじん10個 → +5%
    expect(g.basePerSec()).toBeCloseTo(10 * 1.05 * 1.45);
  });

  it('群れの力：なかま1匹ごとにタップ +3%', () => {
    const { g } = setup({ owned: { hay: 99, friend: 10 } });
    expect(g.baseClick()).toBe(100);
    give(g, 'pack');
    expect(g.baseClick()).toBe(130);
  });

  it('子だくさん：なかまの値上がり率が下がる', () => {
    const { g } = setup({ owned: { friend: 10 } });
    const before = g.cost(data.items.find((i) => i.id === 'friend'));
    give(g, 'bigfamily');
    expect(g.cost(data.items.find((i) => i.id === 'friend'))).toBeLessThan(before);
  });

  it('ブラッシング職人：ドラッグでなでたときだけ ×3', () => {
    const { g } = setup({ owned: { hay: 9 } });
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

  it('おるすばん上手：オフライン報酬が100%', () => {
    const { g } = setup({ owned: { carrot: 10 } });
    give(g, 'housesit');
    expect(g.applyOffline(3600 * 1000).amount).toBe(36000);
  });

  it('全カードの効果キーは game.js が知っているものだけ', () => {
    const known = ['tagMult', 'itemMult', 'perItemPerSec', 'tagCountGlobal', 'clickPerFriend', 'costGrowth',
      'dragMult', 'clickMult', 'perSecMult', 'clickPctOfPerSec', 'goldenWait', 'instantMult', 'buffMultPlus', 'offlineRate'];
    data.cards.forEach((c) => Object.keys(c.effect).forEach((k) => expect(known).toContain(k)));
    data.cards.forEach((c) => c.tags.forEach((t) => expect(data.tagInfo[t]).toBeTruthy()));
  });

  it('カードの id は重複していない', () => {
    const ids = data.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('お引っ越し', () => {
  it('この周で100万集めるまではお引っ越しできない', () => {
    const { g } = setup();
    g.state.run.earned = 999999;
    expect(g.canMove()).toBe(false);
    expect(g.moveHouse()).toBe(null);
  });

  it('思い出は集めたハートの立方根に比例', () => {
    const { g } = setup();
    expect(g.memoriesFor(1e6)).toBe(10);
    expect(g.memoriesFor(8e6)).toBe(20);
    expect(g.memoriesFor(1e9)).toBe(100);
  });

  it('お引っ越しで周回のものがリセットされ、思い出と記録が残る', () => {
    const { g, clock } = setup({ count: 5000, owned: { hay: 10 } });
    g.state.upgrades.hay1 = true;
    give(g, 'glutton');
    g.state.run.earned = 8e6;
    clock.t += 60000;
    const r = g.moveHouse();
    expect(r.memories).toBe(20);
    expect(r.ms).toBe(60000);
    expect(r.cards).toEqual(['glutton']);
    expect(g.meta.memories).toBe(20);
    expect(g.meta.runs).toBe(1);
    expect(g.meta.history[0].earned).toBe(8e6);
    expect(g.state.count).toBe(0);
    expect(g.state.owned).toEqual({});
    expect(g.state.upgrades).toEqual({});
    expect(g.run.cards).toEqual([]);
    expect(g.run.earned).toBe(0);
  });

  it('引っ越し祝い・おやつの前借りが次の周に効く', () => {
    const { g } = setup({ meta: { unlocks: { starter: 1, early: 1 } } });
    g.state.run.earned = 1e6;
    g.moveHouse();
    expect(g.state.owned).toEqual({ hay: 5, carrot: 3 });
    expect(g.run.pending).toBe(1);
  });
});

describe('思い出ショップ', () => {
  it('思い出が足りれば買えて、レベルが上がる', () => {
    const { g } = setup({ meta: { memories: 30 } });
    expect(g.buyMeta(meta('reroll'))).toBe(true);   // 15
    expect(g.metaLevel('reroll')).toBe(1);
    expect(g.metaCost(meta('reroll'))).toBe(45);
    expect(g.buyMeta(meta('reroll'))).toBe(false);  // 残り15 < 45
  });

  it('1回きりのものは2回買えない', () => {
    const { g } = setup({ meta: { memories: 100 } });
    expect(g.buyMeta(meta('starter'))).toBe(true);
    expect(g.metaCost(meta('starter'))).toBe(null);
    expect(g.buyMeta(meta('starter'))).toBe(false);
  });

  it('思い出の力：1レベルごとに全体 +10%', () => {
    const { g } = setup({ owned: { carrot: 10 }, meta: { unlocks: { boost: 2 } } });
    expect(g.basePerSec()).toBeCloseTo(12);
  });
});

describe('前のバージョンからの引き継ぎ', () => {
  it('周回データがないセーブは、今までの累計をこの周の分として続ける', () => {
    const g = createGame(data);
    g.init({ count: 10, owned: {}, stats: { earned: 2e6 } });
    expect(g.run.earned).toBe(2e6);
    expect(g.canMove()).toBe(true);
  });
});
