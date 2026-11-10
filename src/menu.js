// menu.js — ☰ メニュー（つづける・あそびかた・思い出ショップ・実績・音・やり直し・データ消去）と 📖 あそびかた

export function setupMenu({ game, store, settings, fmt, version, openHome, openAch, openMixer, onRestart, onWipe }) {
  const $ = (id) => document.getElementById(id);
  const menu = $('menuPanel');
  const help = $('helpPanel');
  let lastFocus = null;

  function open(p) {
    lastFocus = document.activeElement;
    p.classList.add('open');
    const f = p.querySelector('button');
    if (f) { f.focus(); }
  }
  function close(p, restoreFocus = true) {
    p.classList.remove('open');
    if (restoreFocus && lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  // メニューを閉じてから、ほかのパネルを開く
  const thenOpen = (fn) => () => { close(menu, false); resetConfirms(); fn(); };

  // ---------- ☰ メニュー ----------
  function renderMenu() {
    $('menuMem').textContent = `💭 ${fmt(game.meta.memories)}`;
    $('menuFoot').textContent = `ふゆごもりモルモット v${version}　挑戦 ${game.meta.games} 回・成功 ${game.meta.clears} 回`;
    // 冬が終わっているときは「やり直す」ではなく「新しい冬」
    $('restartBtn').firstChild.textContent = game.isOver() ? '🔄 新しい冬をはじめる ' : '🔄 この冬をやり直す ';
  }

  $('menuBtn').addEventListener('click', () => { renderMenu(); open(menu); });
  $('menuClose').addEventListener('click', () => { resetConfirms(); close(menu); });
  $('menuResume').addEventListener('click', () => { resetConfirms(); close(menu); });
  menu.addEventListener('click', (e) => { if (e.target === menu) { resetConfirms(); close(menu); } });
  $('helpBtn').addEventListener('click', thenOpen(openHelp));
  $('homeBtn').addEventListener('click', thenOpen(openHome));
  $('achBtn').addEventListener('click', thenOpen(openAch));
  $('menuSound').addEventListener('click', thenOpen(openMixer));

  // 2回押しで確定するボタン（間違えて押さないように）
  const confirms = [];
  function twoStep(btn, askText, action) {
    const original = btn.innerHTML;
    let timer = null;
    const reset = () => { clearTimeout(timer); btn.classList.remove('confirm'); btn.innerHTML = original; };
    confirms.push(reset);
    btn.addEventListener('click', () => {
      if (!btn.classList.contains('confirm')) {
        resetConfirms();
        btn.classList.add('confirm');
        btn.textContent = askText;
        timer = setTimeout(reset, 4000);
        return;
      }
      reset();
      action();
    });
  }
  function resetConfirms() { confirms.forEach((r) => r()); }

  twoStep($('restartBtn'), 'ほんとうに？ もう一度押すとやり直す', () => {
    close(menu, false);
    onRestart();
  });
  twoStep($('wipeBtn'), '⚠️ ほんとうに全部消す？ もう一度押すと消える', () => {
    close(menu, false);
    onWipe();
  });

  // ---------- 📖 あそびかた ----------
  function openHelp() { open(help); }
  function closeHelp() {
    close(help);
    if (!settings.seenHelp) { settings.seenHelp = true; store.writeSettings(settings); }
  }
  $('helpClose').addEventListener('click', closeHelp);
  $('helpOk').addEventListener('click', closeHelp);
  help.addEventListener('click', (e) => { if (e.target === help) { closeHelp(); } });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') { return; }
    if (help.classList.contains('open')) { closeHelp(); } else if (menu.classList.contains('open')) { resetConfirms(); close(menu); }
  });

  // はじめて遊ぶときは、あそびかたを1回だけ自動で出す
  if (!settings.seenHelp && game.meta.games === 0 && game.stats.taps === 0) { setTimeout(openHelp, 300); }

  return { openHelp };
}
