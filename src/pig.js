// pig.js — モルモット本体のしぐさ（鼻ヒクヒク・もぐもぐ・うっとり・寝る・ポップコーン）
// 見た目の切り替えは SVG にクラスを付け外しするだけで、動きそのものは style.css にある

const SVG_NS = 'http://www.w3.org/2000/svg';

// 毛並みの線を描く（毎回同じ模様になるよう乱数を固定）
export function drawFur(group, count = 340) {
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  for (let i = 0; i < count; i++) {
    const x = 60 + rnd() * 260;
    const y = 80 + rnd() * 150;
    // 上の方は後ろ向き、下に行くほど下向きに流れる
    const ang = (10 + (y - 80) / 150 * 50 + (rnd() - 0.5) * 10) * Math.PI / 180;
    const len = 6 + rnd() * 5;
    const dx = Math.cos(ang) * len;
    const dy = Math.sin(ang) * len;
    const light = rnd() < 0.45;
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', `M${x.toFixed(1)} ${y.toFixed(1)} q${(dx / 2).toFixed(1)} ${(dy / 2 - 2).toFixed(1)} ${dx.toFixed(1)} ${dy.toFixed(1)}`);
    p.setAttribute('stroke', light ? '#fff' : '#000');
    p.setAttribute('stroke-opacity', light ? '.16' : '.08');
    p.setAttribute('stroke-width', (0.8 + rnd() * 0.6).toFixed(2));
    group.appendChild(p);
  }
}

export function createPig(svg, {
  sleepAfterMs = 15000,   // さわらないで放っておくと寝るまでの時間
  chewEveryMs = 9000,     // 勝手にもぐもぐするか判定する間隔
  chewChance = 0.35,
  feverHopMs = 2600       // ごきげんタイム中にポップコーンする間隔
} = {}) {
  drawFur(svg.querySelector('.fur-strokes'));

  let mode = 'idle';      // idle | chewing | petting | sleeping
  let modeTimer = null;
  let idleTimer = null;
  let feverTimer = null;
  let fever = false;

  function setMode(m, ms) {
    svg.classList.remove('chewing', 'petting', 'sleeping');
    if (m !== 'idle') { svg.classList.add(m); }
    mode = m;
    clearTimeout(modeTimer);
    if (ms) { modeTimer = setTimeout(() => setMode('idle'), ms); }
  }

  function poke() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (!fever) { setMode('sleeping'); } }, sleepAfterMs);
  }

  function popcorn() {
    if (!svg.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    svg.animate([
      { transform: 'translateY(0) rotate(0) scale(1,1)' },
      { transform: 'translateY(4px) scale(1.07,.9)', offset: 0.12 },
      { transform: 'translateY(-48px) rotate(-12deg) scale(.96,1.05)', offset: 0.45 },
      { transform: 'translateY(-28px) rotate(8deg)', offset: 0.66 },
      { transform: 'translateY(0) rotate(0) scale(1.08,.9)', offset: 0.86 },
      { transform: 'translateY(0) rotate(0) scale(1,1)' }
    ], { duration: 760, easing: 'ease-out' });
  }

  // なでられた。寝ていたら起きる（起きたら true を返す）
  function pet(ms = 1200) {
    const woke = mode === 'sleeping';
    setMode(woke ? 'idle' : 'petting', woke ? 0 : ms);
    poke();
    return woke;
  }

  function chew() {
    setMode('chewing', 3300);
    poke();
  }

  function setFever(on) {
    if (on === fever) { return; }
    fever = on;
    clearInterval(feverTimer);
    if (on) {
      if (mode === 'sleeping') { setMode('idle'); }
      popcorn();
      feverTimer = setInterval(popcorn, feverHopMs);
    }
    poke();
  }

  // ときどき勝手にもぐもぐする
  setInterval(() => {
    if (mode === 'idle' && !fever && Math.random() < chewChance) { chew(); }
  }, chewEveryMs);
  poke();

  return { pet, chew, popcorn, setFever, isSleeping: () => mode === 'sleeping' };
}
