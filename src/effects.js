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
