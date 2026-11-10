// sound.js — WebAudio で作る小さな鳴き声・効果音（音声ファイルは使わない）

export function createSound(isOn) {
  let ctx = null;

  function tone(freqs, dur, vol = 0.08) {
    if (!isOn()) { return; }
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime;
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const start = t + i * dur * 0.8;
        o.type = 'sine';
        o.frequency.setValueAtTime(f, start);
        o.frequency.exponentialRampToValueAtTime(f * 1.45, start + dur * 0.5);
        o.frequency.exponentialRampToValueAtTime(f * 1.1, start + dur);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(vol, start + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.connect(g).connect(ctx.destination);
        o.start(start);
        o.stop(start + dur + 0.02);
      });
    } catch (e) { /* 音が出せない環境では何もしない */ }
  }

  return {
    squeak: () => tone([950 + Math.random() * 300], 0.13),
    buy: () => tone([700, 1050], 0.1, 0.06),
    golden: () => tone([800, 1000, 1250, 1600], 0.11, 0.07)
  };
}
