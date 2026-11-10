// decor.js — 品物を買うとステージに増えていく飾り（おうち・お庭・モルモット村）

const HOUSE = `<svg viewBox="0 0 120 100" aria-hidden="true">
  <ellipse cx="60" cy="96" rx="54" ry="5" fill="#000" opacity=".15"/>
  <path d="M10 46 L60 10 L110 46 Z" fill="#b5603a"/>
  <path d="M10 46 L60 10 L110 46" fill="none" stroke="#8a4126" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
  <rect x="20" y="44" width="80" height="50" rx="4" fill="#d9a066"/>
  <g stroke="#b88450" stroke-width="2" opacity=".7"><path d="M20 58 H100 M20 72 H100 M20 86 H100"/></g>
  <path d="M46 94 V72 A14 14 0 0 1 74 72 V94 Z" fill="#4a2e1d"/>
  <circle cx="60" cy="30" r="6" fill="#ffe6a8" stroke="#8a4126" stroke-width="2"/>
</svg>`;

const TREE = `<svg viewBox="0 0 100 130" aria-hidden="true">
  <ellipse cx="50" cy="126" rx="34" ry="4" fill="#000" opacity=".15"/>
  <path d="M44 126 C46 104 46 90 42 76 L58 76 C54 90 54 104 56 126 Z" fill="#8a5a3a"/>
  <circle cx="50" cy="52" r="32" fill="#5fa64a"/>
  <circle cx="30" cy="66" r="20" fill="#4f9440"/>
  <circle cx="70" cy="64" r="22" fill="#4f9440"/>
  <circle cx="40" cy="40" r="14" fill="#7cc163" opacity=".8"/>
</svg>`;

const FLOWER_COLORS = ['#ff9ab0', '#ffd23f', '#ffffff', '#c9a6ff', '#ff8a5c'];
const flower = (c) => `<svg viewBox="0 0 30 40" aria-hidden="true">
  <path d="M15 40 V20" stroke="#4f9440" stroke-width="2.5"/>
  <path d="M15 32 Q8 28 6 22 Q12 24 15 30" fill="#5fa64a"/>
  <g fill="${c}"><circle cx="15" cy="9" r="5"/><circle cx="22" cy="14" r="5"/><circle cx="19" cy="21" r="5"/><circle cx="11" cy="21" r="5"/><circle cx="8" cy="14" r="5"/></g>
  <circle cx="15" cy="15" r="3.6" fill="#f2b33d"/>
</svg>`;

const HUT_COLORS = [['#c9805a', '#e7c49a'], ['#8a6ab0', '#e9dcc8'], ['#5f9a8a', '#efe2c9'], ['#c96a6a', '#f1dfc6'], ['#7a8fc0', '#eadfcc']];
const hut = ([roof, wall]) => `<svg viewBox="0 0 60 50" aria-hidden="true">
  <path d="M4 24 L30 4 L56 24 Z" fill="${roof}"/>
  <rect x="10" y="22" width="40" height="26" rx="2" fill="${wall}"/>
  <path d="M24 48 V38 A6 6 0 0 1 36 38 V48 Z" fill="#5a3a26"/>
</svg>`;

// 置き場所（ステージに対する %）。left/bottom と幅(px)
const FLOWER_SPOTS = [
  [6, 4], [88, 6], [14, 18], [80, 20], [3, 26], [93, 27], [24, 6], [70, 3], [30, 25], [62, 26], [46, 2], [52, 29]
];

export function createDecor(layerEl) {
  const placed = {}; // key → element

  function put(key, html, style, pop) {
    if (placed[key]) { return placed[key]; }
    const d = document.createElement('div');
    d.className = 'decor' + (pop ? ' pop' : '');
    d.innerHTML = html;
    Object.assign(d.style, style);
    layerEl.appendChild(d);
    placed[key] = d;
    return d;
  }

  // 所持数に合わせて飾りを増やす。pop が true なら新しく出たものを弾ませる
  // 新しく出た飾りの配列を返す（演出の着地点に使う）
  function sync(ownedOf, pop) {
    const added = [];
    const add = (key, html, style) => {
      if (!placed[key]) { added.push(put(key, html, style, pop)); }
    };
    if (ownedOf('house') > 0) {
      add('house', HOUSE, { left: '3%', bottom: '24%', width: '92px', zIndex: 0 });
    }
    const garden = ownedOf('garden');
    if (garden > 0) {
      add('tree', TREE, { right: '2%', bottom: '25%', width: '84px', zIndex: 0 });
      const flowers = Math.min(garden * 2, FLOWER_SPOTS.length);
      for (let i = 0; i < flowers; i++) {
        const [l, b] = FLOWER_SPOTS[i];
        add('flower' + i, flower(FLOWER_COLORS[i % FLOWER_COLORS.length]), { left: l + '%', bottom: b + '%', width: '22px', zIndex: b < 9 ? 3 : 0 });
      }
    }
    const huts = Math.min(ownedOf('village'), HUT_COLORS.length);
    for (let i = 0; i < huts; i++) {
      add('hut' + i, hut(HUT_COLORS[i]), { left: (22 + i * 12) + '%', bottom: '31%', width: '38px', zIndex: 0, opacity: '.85' });
    }
    return added;
  }

  // お引っ越しのときに全部片付ける
  function reset() {
    Object.keys(placed).forEach((k) => { placed[k].remove(); delete placed[k]; });
  }

  return { sync, reset };
}
