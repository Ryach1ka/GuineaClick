// format.js — 数の表示
// 1万未満はそのまま「1,234」、それ以上は「1.23万」「45.6億」のように短くする（切り捨て）

export function formatNumber(n, units) {
  n = Math.floor(n);
  if (n < 10000) { return n.toLocaleString('ja-JP'); }
  for (const [size, label] of units) {
    if (n >= size) {
      const v = n / size;
      const s = v < 10 ? String(Math.floor(v * 100) / 100)
              : v < 100 ? String(Math.floor(v * 10) / 10)
              : Math.floor(v).toLocaleString('ja-JP');
      return s + label;
    }
  }
  return n.toLocaleString('ja-JP');
}
