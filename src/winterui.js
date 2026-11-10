// winterui.js — 寒波の見た目：メーター（何夜目・ノルマ・残り時間）・霜と雪・大きなお知らせ・作戦タイムの帯・⏸

export function setupWinterUI({ game, fmt, sound, onStartNight, onPauseChange, onEndEarly }) {
  const $ = (id) => document.getElementById(id);
  const nightLabel = $('nightLabel');
  const quotaLabel = $('quotaLabel');
  const timeLabel = $('timeLabel');
  const quotaFill = $('quotaFill');
  const timeFill = $('timeFill');
  const winter = $('winter');
  const frost = $('frost');
  const snow = $('snow');
  const banner = $('banner');
  const breakBar = $('breakBar');
  const nightBtn = $('nightBtn');
  const pausePanel = $('pausePanel');
  const pauseBtn = $('pauseBtn');
  const clearBtn = $('clearBtn');
  let paused = false;
  let lastSecond = null;
  let reachedNight = 0; // ノルマ達成を知らせた夜（1夜に1回だけ知らせる）

  // ノルマに届いたら、残り時間を待たずに夜をおえられる（このまま粘って次の夜のために貯めてもいい）
  clearBtn.addEventListener('click', () => { if (game.canEndEarly()) { onEndEarly(); } });

  const mmss = (ms) => {
    const s = Math.ceil(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const nightName = (n) => (n >= game.nightCount() ? '🌨️ 大寒波' : `🌙 ${n}夜目`);

  // 雪のつぶ（寒くなるほど濃く見える）
  for (let i = 0; i < 28; i++) {
    const f = document.createElement('span');
    f.textContent = i % 3 ? '•' : '❄';
    f.style.left = (Math.random() * 100) + '%';
    f.style.fontSize = (0.5 + Math.random() * 0.9).toFixed(2) + 'rem';
    f.style.animationDuration = (4 + Math.random() * 5).toFixed(1) + 's';
    f.style.animationDelay = (-Math.random() * 8).toFixed(1) + 's';
    snow.appendChild(f);
  }

  // 毎フレーム（100ms ごと）に呼ぶ
  function render() {
    const r = game.run;
    const n = r.night;
    const q = game.quota(n);
    const total = game.nightMs(n);
    const night = r.phase === 'night';
    const enough = game.state.count >= q;

    nightLabel.textContent = `${nightName(n)}　${Math.min(n, game.nightCount())}/${game.nightCount()}`;
    quotaLabel.textContent = `${enough ? '✅' : '❄️'} ノルマ ♥${fmt(q)}`;
    quotaLabel.classList.toggle('ok', enough);
    quotaFill.style.width = (Math.min(1, game.state.count / q) * 100).toFixed(1) + '%';
    quotaFill.classList.toggle('ok', enough);
    const left = night ? r.timeLeft : total;
    timeLabel.textContent = night ? mmss(left) : '⏸ ' + mmss(total);
    timeFill.style.width = ((left / total) * 100).toFixed(1) + '%';

    // ノルマ達成：「夜をおえる」ボタンを出す。初めて届いた瞬間はお知らせ
    const canEnd = game.canEndEarly();
    clearBtn.hidden = !canEnd;
    if (canEnd && reachedNight !== n) {
      reachedNight = n;
      sound.paid();
      clearBtn.classList.remove('pop');
      void clearBtn.offsetWidth;
      clearBtn.classList.add('pop');
    }

    // 残り10秒はあせらせる（毎秒チクタク）
    const hurry = night && left <= 10000;
    winter.classList.toggle('hurry', hurry && !enough);
    if (hurry && !paused) {
      const sec = Math.ceil(left / 1000);
      if (sec !== lastSecond) { lastSecond = sec; if (!enough) { sound.tick(); } }
    } else { lastSecond = null; }

    // 寒さ：夜が進むほど霜と雪が濃くなり、モルモットも寒そうになる
    //   作戦タイムでも冬なので少しだけ寒い。ごきげんタイム中はぽかぽか
    const cold = night ? 1 - left / total : 0;
    const pigCold = game.buffLeft() > 0 ? 0.1 : (night ? 0.2 + cold * 0.8 : 0.15);
    const root = document.documentElement.style;
    root.setProperty('--cold', pigCold.toFixed(3));
    root.setProperty('--shiver', (1 + pigCold * 2.5).toFixed(2));
    document.body.classList.toggle('chilly', pigCold >= 0.3 && pigCold < 0.75);
    document.body.classList.toggle('freezing', pigCold >= 0.75);
    frost.style.opacity = (cold * 0.6).toFixed(3);
    snow.style.opacity = night ? (0.25 + cold * 0.75).toFixed(3) : '0.15';
    document.body.classList.toggle('boss', n >= game.nightCount() && night);

    // 作戦タイムの帯
    const isBreak = r.phase === 'break';
    breakBar.hidden = !isBreak;
    pauseBtn.disabled = !night;
    if (isBreak) {
      $('breakTitle').textContent = n === 1 && r.playMs === 0 ? '❄️ 冬がくる…' : '☀️ 作戦タイム';
      $('breakSub').textContent = `次は ${nightName(n)}：ノルマ ♥${fmt(q)}・${Math.round(total / 1000)}秒`;
      const wait = r.pending > 0;
      nightBtn.disabled = wait;
      nightBtn.textContent = wait ? '🎁 先におやつをえらんでね' : `${nightName(n)}へ ▶`;
    }
  }

  // 画面の真ん中に大きなお知らせを出す
  function show(title, sub = '', cls = '') {
    banner.className = 'banner show ' + cls;
    banner.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = title;
    const s = document.createElement('small');
    s.textContent = sub;
    banner.append(b, s);
    clearTimeout(show.t);
    show.t = setTimeout(() => { banner.className = 'banner'; }, 1700);
  }

  nightBtn.addEventListener('click', () => {
    if (!game.startNight()) { return; }
    const n = game.run.night;
    show(nightName(n), `ノルマ ♥${fmt(game.quota(n))}　${Math.round(game.nightMs(n) / 1000)}秒`, n >= game.nightCount() ? 'boss' : '');
    sound.night();
    onStartNight();
    render();
  });

  // ---- ⏸ ひとやすみ ----
  function setPaused(p) {
    if (p && !game.isNight()) { return; }
    paused = p;
    pausePanel.classList.toggle('open', p);
    document.body.classList.toggle('paused', p);
    if (p) { $('pauseResume').focus(); }
    onPauseChange(p);
  }
  pauseBtn.addEventListener('click', () => setPaused(true));
  $('pauseResume').addEventListener('click', () => setPaused(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && paused) { setPaused(false); }
  });
  // タブを裏に回したら自動で止める
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && game.isNight()) { setPaused(true); }
  });

  // 今の寒さ（0〜1）。白い息の大きさなどに使う
  const coldness = () => parseFloat(document.documentElement.style.getPropertyValue('--cold')) || 0;

  return { render, show, setPaused, isPaused: () => paused, coldness };
}
