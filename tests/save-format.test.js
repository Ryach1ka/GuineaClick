import { describe, it, expect } from 'vitest';
import { data } from '../src/data.js';
import { createGame } from '../src/game.js';
import { createStore } from '../src/save.js';
import { formatNumber } from '../src/format.js';

// localStorage の代わりになる入れ物
function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    dump: () => Object.fromEntries(m)
  };
}

describe('セーブ', () => {
  it('空なら 0 から始まる', () => {
    const s = createStore(memoryStorage());
    expect(s.load()).toEqual({ count: 0, owned: {}, upgrades: {}, stats: null, run: null, meta: null });
  });

  it('書いたものがそのまま読める', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    const g = createGame(data);
    g.init({ count: 0, owned: {}, upgrades: {}, stats: null, run: null, meta: null });
    g.startNight();
    g.pet(); g.pet();
    g.state.owned.hay = 3;
    s.write(g);

    const loaded = createStore(storage).load();
    expect(loaded.count).toBe(2);
    expect(loaded.owned).toEqual({ hay: 3 });
    expect(loaded.stats.taps).toBe(2);
  });

  it('最初のバージョンのキーをそのまま読める', () => {
    const s = createStore(memoryStorage({
      'morumotto:count': '123',
      'morumotto:owned': '{"carrot":4}'
    }));
    expect(s.load()).toEqual({ count: 123, owned: { carrot: 4 }, upgrades: {}, stats: null, run: null, meta: null });
  });

  it('強化も保存される', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    const g = createGame(data);
    g.init({ count: 0, owned: {}, stats: null });
    g.state.upgrades.hay1 = true;
    s.write(g);
    expect(s.load().upgrades).toEqual({ hay1: true });
  });

  it('壊れたデータでも落ちない', () => {
    const s = createStore(memoryStorage({ 'morumotto:owned': '{壊れてる', 'morumotto:count': 'abc' }));
    expect(s.load()).toEqual({ count: 0, owned: {}, upgrades: {}, stats: null, run: null, meta: null });
  });

  it('効果音も BGM も最初はオン、音量は 50%', () => {
    const s = createStore(memoryStorage());
    expect(s.loadSettings()).toEqual({ sound: true, bgm: true, sfxVol: 0.5, bgmVol: 0.5 });
    s.writeSettings({ sound: false, bgm: false, sfxVol: 0.2, bgmVol: 0.9 });
    expect(s.loadSettings()).toEqual({ sound: false, bgm: false, sfxVol: 0.2, bgmVol: 0.9 });
  });

  it('設定が足りない古いセーブや変な値でも、足りない分は初期値になる', () => {
    const s = createStore(memoryStorage({ 'morumotto:settings': '{"sound":false,"bgmVol":7}' }));
    expect(s.loadSettings()).toEqual({ sound: false, bgm: true, sfxVol: 0.5, bgmVol: 0.5 });
  });

  it('冬の途中の状態（何夜目・残り時間・カード）と思い出も保存される', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    const g = createGame(data);
    g.init({ count: 0, owned: {}, stats: null });
    g.startNight();
    g.update(10000);
    g.state.run.cards.push('glutton');
    g.meta.memories = 42;
    s.write(g);
    const g2 = createGame(data);
    g2.init(s.load());
    expect(g2.run.phase).toBe('night');
    expect(g2.run.timeLeft).toBe(g.run.timeLeft);
    expect(g2.run.cards).toEqual(['glutton']);
    expect(g2.meta.memories).toBe(42);
  });
});

describe('数の表示', () => {
  const f = (n) => formatNumber(n, data.units);
  it('1万未満はカンマ区切り', () => {
    expect(f(0)).toBe('0');
    expect(f(9999)).toBe('9,999');
  });
  it('1万以上は単位つき・切り捨て', () => {
    expect(f(12345)).toBe('1.23万');
    expect(f(123456)).toBe('12.3万');
    expect(f(99999999)).toBe('9,999万');
    expect(f(450000000)).toBe('4.5億');
    expect(f(2e12)).toBe('2兆');
  });
});
