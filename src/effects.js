// effects.js — 画面全体に重ねる演出（飛んでいくアイコン・キラキラ・紙吹雪）
// 座標はすべて画面（viewport）基準。reduced-motion のときは動きを省いてすぐ終わる

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

let layer = null;
function getLayer() {
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(layer);
  }
  return layer;
}

export function centerOf(el, fx = 0.5, fy = 0.5) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width * fx, y: r.top + r.height * fy };
}

// from から to へ、放物線を描いてアイコンを飛ばす。着いたら resolve
export function flyIcon(text, from, to, { duration = 620, size = 2 } = {}) {
  return new Promise((resolve) => {
    if (reduced() || !Element.prototype.animate) { resolve(); return; }
    const s = document.createElement('span');
    s.className = 'fx-fly';
    s.textContent = text;
    s.style.fontSize = size + 'rem';
    getLayer().appendChild(s);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lift = Math.min(-80, dy - 90); // 弧の高さ
    const at = (x, y, sc, rot) => ({ transform: `translate(${from.x + x}px, ${from.y + y}px) translate(-50%,-50%) scale(${sc}) rotate(${rot}deg)` });
    const a = s.animate([
      at(0, 0, 0.6, 0),
      { ...at(dx * 0.5, lift, 1.25, -20), offset: 0.45 },
      at(dx, dy, 0.9, 10)
    ], { duration, easing: 'cubic-bezier(.3,.7,.4,1)' });
    a.onfinish = () => { s.remove(); resolve(); };
  });
}

// 小さなかけらを何個か、ばらばらの弧・回転・タイミングで飛ばす
//   onEach(i) は i 個目が着いたとき、全部着いたら resolve
export function flyCrumbs(text, from, to, { count = 4, size = 1.4, spreadArc = 1, onEach = () => {} } = {}) {
  if (reduced() || !Element.prototype.animate) {
    for (let i = 0; i < count; i++) { onEach(i); }
    return Promise.resolve();
  }
  const L = getLayer();
  const flights = [];
  for (let i = 0; i < count; i++) {
    flights.push(new Promise((resolve) => {
      const s = document.createElement('span');
      s.className = 'fx-fly';
      s.textContent = text;
      s.style.fontSize = (size * (0.75 + Math.random() * 0.5)).toFixed(2) + 'rem';
      L.appendChild(s);
      // 2次ベジェ曲線の制御点をランダムにずらして、毎回ちがう軌道にする
      const end = { x: to.x + (Math.random() - 0.5) * 16, y: to.y + (Math.random() - 0.5) * 12 };
      const ctrl = {
        x: (from.x + end.x) / 2 + (Math.random() - 0.5) * 220 * spreadArc,
        y: Math.min(from.y, end.y) - (70 + Math.random() * 150) * spreadArc
      };
      const spin = (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360);
      const frames = [];
      const N = 10;
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * ctrl.x + t * t * end.x;
        const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * ctrl.y + t * t * end.y;
        const sc = t < 0.2 ? 0.5 + t * 3 : 1.1 - (t - 0.2) * 0.5;
        frames.push({ transform: `translate(${x}px, ${y}px) translate(-50%,-50%) rotate(${spin * t}deg) scale(${sc.toFixed(2)})` });
      }
      const a = s.animate(frames, {
        duration: 480 + Math.random() * 300,
        delay: i * (50 + Math.random() * 60),
        easing: 'cubic-bezier(.35,.1,.6,1)',
        fill: 'backwards'
      });
      a.onfinish = () => { s.remove(); onEach(i); resolve(); };
    }));
  }
  return Promise.all(flights);
}

// 点からキラキラが飛び散る
export function burst(p, { count = 12, chars = ['✦', '♥', '✧'], colors = ['#ffd23f', '#ff7a9a', '#fff3b0'], spread = 70 } = {}) {
  if (reduced() || !Element.prototype.animate) { return; }
  const L = getLayer();
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'fx-spark';
    s.textContent = chars[i % chars.length];
    s.style.color = colors[i % colors.length];
    s.style.fontSize = (0.7 + Math.random() * 0.8).toFixed(2) + 'rem';
    L.appendChild(s);
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = spread * (0.6 + Math.random() * 0.6);
    const x = Math.cos(ang) * dist;
    const y = Math.sin(ang) * dist - 20;
    const base = `translate(${p.x}px, ${p.y}px) translate(-50%,-50%)`;
    s.animate([
      { transform: base + ' scale(.3)', opacity: 1 },
      { transform: base + ` translate(${x * 0.8}px, ${y * 0.8}px) scale(1.1)`, opacity: 1, offset: 0.55 },
      { transform: base + ` translate(${x}px, ${y + 18}px) scale(.6)`, opacity: 0 }
    ], { duration: 700 + Math.random() * 300, easing: 'ease-out' }).onfinish = () => s.remove();
  }
}

// 範囲の上から紙吹雪を降らせる（お祝い用）
export function confetti(rect, { count = 36 } = {}) {
  if (reduced() || !Element.prototype.animate) { return; }
  const L = getLayer();
  const colors = ['#ff7a9a', '#ffd23f', '#7ccf6a', '#6ab8ff', '#c08cff', '#ffffff'];
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    s.className = 'fx-confetti';
    s.style.background = colors[i % colors.length];
    L.appendChild(s);
    const x = rect.left + Math.random() * rect.width;
    const y = rect.top - 10;
    const fall = rect.height * (0.6 + Math.random() * 0.5);
    const sway = (Math.random() - 0.5) * 120;
    const spin = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540);
    s.animate([
      { transform: `translate(${x}px, ${y}px) rotate(0deg)`, opacity: 1 },
      { transform: `translate(${x + sway}px, ${y + fall}px) rotate(${spin}deg)`, opacity: 0 }
    ], { duration: 1400 + Math.random() * 900, delay: Math.random() * 250, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'backwards' }).onfinish = () => s.remove();
  }
}

// 白い息（口元から左上へふわっと広がって消える）。size は 0〜1
export function puff(p, size = 0.5) {
  if (reduced() || !Element.prototype.animate) { return; }
  const s = document.createElement('span');
  s.className = 'fx-puff';
  getLayer().appendChild(s);
  const sc = 0.8 + size * 1.6;
  const base = `translate(${p.x}px, ${p.y}px) translate(-50%,-50%)`;
  s.animate([
    { transform: base + ' scale(.3)', opacity: 0 },
    { transform: base + ` translate(-10px,-4px) scale(${sc * 0.7})`, opacity: 0.9, offset: 0.25 },
    { transform: base + ` translate(-34px,-22px) scale(${sc * 1.4})`, opacity: 0 }
  ], { duration: 1300, easing: 'ease-out' }).onfinish = () => s.remove();
}

// 要素の近くに小さな文字をふわっと出す（「−♥31」「+1/秒」など）
export function floatLabel(text, p, cls = '') {
  const s = document.createElement('span');
  s.className = 'fx-label' + (cls ? ' ' + cls : '');
  s.textContent = text;
  s.style.left = p.x + 'px';
  s.style.top = p.y + 'px';
  getLayer().appendChild(s);
  setTimeout(() => s.remove(), 1300);
}
