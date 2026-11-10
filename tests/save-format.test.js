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
    expect(s.load()).toEqual({ count: 0, owned: {}, stats: null });
  });

  it('書いたものがそのまま読める', () => {
    const storage = memoryStorage();
    const s = createStore(storage);
    const g = createGame(data);
    g.init({ count: 0, owned: {}, stats: null });
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
    expect(s.load()).toEqual({ count: 123, owned: { carrot: 4 }, stats: null });
  });

  it('壊れたデータでも落ちない', () => {
    const s = createStore(memoryStorage({ 'morumotto:owned': '{壊れてる', 'morumotto:count': 'abc' }));
    expect(s.load()).toEqual({ count: 0, owned: {}, stats: null });
  });

  it('音の設定は最初オフ', () => {
    const s = createStore(memoryStorage());
    expect(s.loadSettings()).toEqual({ sound: false });
    s.writeSettings({ sound: true });
    expect(s.loadSettings()).toEqual({ sound: true });
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
