// sound.js — WebAudio で作る効果音と BGM（音声ファイルは使わない）
// ブラウザは最初の操作（タップ・キー入力）までは音を出せないので、unlock() で鳴らし始める

// ---- BGM の譜面（96 BPM・8分音符単位・8小節ループ。数字は MIDI ノート番号、null は休み） ----
const BPM = 96;
const STEP = 60 / BPM / 2; // 8分音符の長さ（秒）
const MELODY = [
  76, 79, null, 79, 81, 79, 76, null,      // C
  84, null, 81, null, 79, null, 76, null,  // Am
  77, 81, null, 81, 84, 81, 77, null,      // F
  79, null, 83, null, 86, null, null, null,// G
  76, 79, 84, 79, 76, 79, 84, null,        // C
  81, null, 79, null, 76, null, 72, null,  // Am
  77, null, 81, null, 79, null, 76, null,  // F
  74, null, 79, null, 72, null, null, null // G → C
];
const BASS = [48, 45, 41, 43, 48, 45, 41, 43];       // 小節ごとの根音
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// sfxVol / bgmVol は 0〜1（50% で今までの音量）
export function createSound({ sfxOn, bgmOn, sfxVol = () => 0.5, bgmVol = () => 0.5 }) {
  let ctx = null;
  let sfxBus = null;
  let bgmBus = null;
  const sfxGain = () => sfxVol() * 2;
  const bgmGain = () => bgmVol() * 1.4;

  function ensure() {
    if (ctx) { return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { return null; }
    ctx = new AC();
    sfxBus = ctx.createGain();
    sfxBus.gain.value = sfxGain();
    sfxBus.connect(ctx.destination);
    bgmBus = ctx.createGain();
    bgmBus.gain.value = 0;
    bgmBus.connect(ctx.destination);
    return ctx;
  }

  // ミキサーのスライダーを動かしたら呼ぶ
  function applyVolumes() {
    if (!ctx) { return; }
    const t = ctx.currentTime;
    sfxBus.gain.setTargetAtTime(sfxGain(), t, 0.05);
    if (timer) { bgmBus.gain.cancelScheduledValues(t); bgmBus.gain.setTargetAtTime(bgmGain(), t, 0.05); }
  }

  // ---- 効果音 ----
  function tone(freqs, dur, vol = 0.08) {
    if (!sfxOn() || !ensure()) { return; }
    try {
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
        o.connect(g).connect(sfxBus);
        o.start(start);
        o.stop(start + dur + 0.02);
      });
    } catch (e) { /* 音が出せない環境では何もしない */ }
  }

  // ---- BGM ----
  function pluck(midi, at, { type = 'sine', vol = 0.05, decay = 0.5, attack = 0.008 } = {}) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(midiHz(midi), at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    o.connect(g).connect(bgmBus);
    o.start(at);
    o.stop(at + decay + 0.05);
  }

  let step = 0;
  let nextTime = 0;
  let timer = null;

  function scheduleStep(i, at) {
    const mel = MELODY[i % MELODY.length];
    if (mel != null) {
      pluck(mel, at, { vol: 0.05, decay: 0.55 });
      pluck(mel + 12, at, { vol: 0.012, decay: 0.3 }); // 1オクターブ上を薄く重ねてオルゴール風に
    }
    const bar = Math.floor(i / 8) % BASS.length;
    const inBar = i % 8;
    if (inBar === 0 || inBar === 4) {
      pluck(BASS[bar], at, { type: 'triangle', vol: 0.07, decay: 0.7 });
    }
    if (inBar === 2 || inBar === 6) {
      CHORDS[bar % CHORDS.length].forEach((n) => pluck(n, at, { vol: 0.012, decay: 0.35 }));
    }
  }

  function scheduler() {
    while (nextTime < ctx.currentTime + 0.25) {
      scheduleStep(step, nextTime);
      step += 1;
      nextTime += STEP;
    }
  }

  function startBgm() {
    if (timer || !bgmOn() || !ensure()) { return; }
    nextTime = ctx.currentTime + 0.1;
    step = 0;
    bgmBus.gain.cancelScheduledValues(ctx.currentTime);
    bgmBus.gain.setValueAtTime(0, ctx.currentTime);
    bgmBus.gain.linearRampToValueAtTime(bgmGain(), ctx.currentTime + 1.2);
    scheduler();
    timer = setInterval(scheduler, 100);
  }

  function stopBgm() {
    if (!timer) { return; }
    clearInterval(timer);
    timer = null;
    bgmBus.gain.cancelScheduledValues(ctx.currentTime);
    bgmBus.gain.setValueAtTime(bgmBus.gain.value, ctx.currentTime);
    bgmBus.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
  }

  // 設定が変わったら呼ぶ
  function syncBgm() {
    if (bgmOn()) { startBgm(); } else { stopBgm(); }
  }

  // 最初の操作で呼ぶ（ここで初めて音が出せるようになる）
  function unlock() {
    if (!ensure()) { return; }
    if (ctx.state === 'suspended') { ctx.resume(); }
    syncBgm();
  }

  // タブを裏に回したら止め、戻ったら再開する
  document.addEventListener('visibilitychange', () => {
    if (!ctx) { return; }
    if (document.visibilityState === 'hidden') { ctx.suspend(); } else { ctx.resume(); }
  });

  return {
    unlock,
    syncBgm,
    applyVolumes,
    squeak: () => tone([950 + Math.random() * 300], 0.13),
    buy: () => tone([700, 1050], 0.1, 0.06),
    golden: () => tone([800, 1000, 1250, 1600], 0.11, 0.07),
    land: () => tone([1200, 1500], 0.08, 0.05),
    // パクッ（かけらごとに少しずつ音程を上げる）
    nom: (i = 0) => tone([620 * Math.pow(1.12, i) * (0.97 + Math.random() * 0.06)], 0.07, 0.06),
    jackpot: () => tone([780, 980, 1170, 1560, 1960], 0.1, 0.08),
    digitUp: () => tone([990, 1320, 1760], 0.12, 0.07),
    card: () => tone([520, 780, 1040], 0.12, 0.07),
    fanfare: () => tone([660, 830, 990, 1320], 0.14, 0.08),
    move: () => tone([523, 659, 784, 1047, 1319, 1568], 0.16, 0.08),
    // 夜のはじまり（低めの2音）・残り10秒のチクタク・ノルマを払えた・寒さに負けた
    night: () => tone([392, 330], 0.22, 0.07),
    tick: () => tone([1500], 0.04, 0.035),
    paid: () => tone([660, 880, 1100], 0.12, 0.08),
    lose: () => tone([440, 370, 311, 262], 0.22, 0.07)
  };
}
