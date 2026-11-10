// counter.js — 大きなハートの数字の演出
//   ・数字は一瞬で変わらず、なめらかに数え上がる（減るときも）
//   ・増えた量が大きいほど大きく弾む
//   ・桁が上がった瞬間（1万→10万 など）は光ってお祝い

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const digits = (n) => String(Math.floor(Math.max(0, n))).length;

export function createCounter(el, format, { onDigitUp = () => {} } = {}) {
  let shown = 0;
  let target = 0;
  let maxDigits = 0;
  let last = performance.now();
  let started = false;

  function draw() {
    el.textContent = format(shown);
  }

  function frame(t) {
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (shown !== target) {
      // 差が大きいほど速く近づく（約0.3秒で追いつく）
      shown += (target - shown) * Math.min(1, dt * 12);
      if (Math.abs(target - shown) < 0.5) { shown = target; }
      draw();
    }
    requestAnimationFrame(frame);
  }

  // 目標の値を設定する（表示はなめらかに追いかける）
  function set(value) {
    target = value;
    el.title = Math.floor(value).toLocaleString('ja-JP');
    if (!started) {
      started = true;
      shown = value;
      maxDigits = digits(value);
      draw();
      requestAnimationFrame(frame);
      return;
    }
    if (reduced()) { shown = value; draw(); }
    const d = digits(value);
    if (d > maxDigits) {
      maxDigits = d;
      el.classList.remove('levelup');
      void el.offsetWidth;
      el.classList.add('levelup');
      onDigitUp(d);
    }
  }

  // 増えた量に応じて弾ませる（gain が今の値に対して大きいほど大きく）
  function pop(gain) {
    if (reduced() || gain <= 0) { return; }
    const ratio = gain / Math.max(1, target);
    const s = 1 + Math.min(0.28, 0.05 + Math.sqrt(ratio) * 0.35);
    el.animate(
      [{ transform: 'scale(1)' }, { transform: `scale(${s.toFixed(3)})`, offset: 0.35 }, { transform: 'scale(1)' }],
      { duration: 260 + (s - 1) * 900, easing: 'cubic-bezier(.3,1.6,.5,1)' }
    );
  }

  // アニメーションせずにすぐ切り替える（お引っ越しで 0 に戻すときなど）
  function snap(value) {
    target = shown = value;
    maxDigits = digits(value);
    el.title = Math.floor(value).toLocaleString('ja-JP');
    draw();
  }

  return { set, pop, snap };
}
