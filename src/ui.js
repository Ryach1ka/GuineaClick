// ui.js — 画面の表示とイベント

import { formatNumber } from './format.js';
import { createSound } from './sound.js';

export function startUI({ data, game, store }) {
  const $ = (id) => document.getElementById(id);
  const el = $('count');
  const pig = $('pig');
  const bubble = $('bubble');
  const stage = document.querySelector('.stage');
  const shop = $('shop');
  const rateEl = $('rate');
  const herd = $('herd');
  const toasts = $('toasts');
  const achBtn = $('achBtn');
  const achPanel = $('achPanel');
  const achList = $('achList');
  const soundBtn = $('soundBtn');

  const buttons = {};      // 品物id → ボタン
  let lockedBtn = null;    // 次に解放される品物の「？？？」ボタン
  let bubbleTimer = null;
  let wasFever = false;
  const settings = store.loadSettings();
  const sound = createSound(() => settings.sound);

  const fmt = (n) => formatNumber(n, data.units);
  const save = () => store.write(game);

  function renderCount() {
    el.textContent = fmt(game.state.count);
    el.title = Math.floor(game.state.count).toLocaleString('ja-JP');
  }

  function bump(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  // ---------- 音のボタン ----------
  function renderSound() {
    soundBtn.textContent = settings.sound ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-label', settings.sound ? '音を消す' : '音を出す');
    soundBtn.setAttribute('aria-pressed', String(settings.sound));
  }
  soundBtn.addEventListener('click', () => {
    settings.sound = !settings.sound;
    store.writeSettings(settings);
    renderSound();
    sound.squeak();
  });

  // ---------- ショップ ----------
  function buildShop() {
    data.items.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'item';
      b.type = 'button';
      b.innerHTML = '<span class="nm"></span><span class="ds"></span><span class="pr"></span>';
      b.addEventListener('click', () => onBuy(it, b));
      buttons[it.id] = b;
      shop.appendChild(b);
    });
    lockedBtn = document.createElement('button');
    lockedBtn.className = 'item locked';
    lockedBtn.type = 'button';
    lockedBtn.disabled = true;
    lockedBtn.innerHTML = '<span class="nm">？？？</span><span class="ds">もっとハートをあつめよう</span><span class="pr"></span>';
    shop.appendChild(lockedBtn);
  }

  function refreshShop() {
    let nextLocked = null;
    data.items.forEach((it) => {
      const b = buttons[it.id];
      const open = game.isUnlocked(it);
      b.hidden = !open;
      if (!open) {
        if (!nextLocked) { nextLocked = it; }
        return;
      }
      const c = game.cost(it);
      b.querySelector('.nm').textContent = it.name + ' ×' + game.ownedOf(it.id);
      b.querySelector('.ds').textContent = it.desc;
      b.querySelector('.pr').textContent = '♥ ' + fmt(c);
      b.disabled = game.state.count < c;
    });
    lockedBtn.hidden = !nextLocked;
    if (nextLocked) {
      lockedBtn.querySelector('.pr').textContent = '♥ ' + fmt(game.cost(nextLocked));
    }
  }

  function refreshRate() {
    const left = game.buffLeft();
    const fever = left > 0;
    let txt = '(毎秒 ' + fmt(game.perSec()) + ' / タップ +' + fmt(game.clickPower()) + ')';
    if (fever) { txt += ' ✨×' + data.golden.buffMult + ' あと' + Math.ceil(left / 1000) + '秒'; }
    rateEl.textContent = txt;
    if (fever !== wasFever) {
      document.body.classList.toggle('fever', fever);
      wasFever = fever;
      refreshShop();
    }
  }

  function refresh() {
    refreshShop();
    refreshRate();
    achBtn.textContent = '🏆 ' + game.achievementCount() + '/' + data.achievements.length;
  }

  function onBuy(it, b) {
    if (!game.buy(it)) { return; }
    renderCount();
    save();
    bump(b, 'bought');
    sound.buy();
    if (it.herd) { syncHerd(true); }
    afterChange();
  }

  // ---------- モルモット本体 ----------
  function animatePig() {
    pig.classList.add('press');
    bump(pig.querySelector('.ear'), 'wig');
    const svg = pig.querySelector('svg');
    if (svg.animate) {
      svg.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-12px)' }, { transform: 'translateY(0)' }],
        { duration: 240, easing: 'ease-out' }
      );
    }
    setTimeout(() => pig.classList.remove('press'), 110);
  }

  function flyText(x, y, text, extra) {
    const h = document.createElement('span');
    h.className = 'fly' + (extra ? ' ' + extra : '');
    h.textContent = text;
    h.style.left = (x - 12 + (Math.random() * 30 - 15)) + 'px';
    h.style.top = (y - 20) + 'px';
    stage.appendChild(h);
    setTimeout(() => h.remove(), 1000);
  }

  function speak() {
    const list = game.buffLeft() > 0 ? data.happyWords : data.words;
    bubble.textContent = list[Math.floor(Math.random() * list.length)];
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 900);
  }

  function onPet(ev) {
    const gain = game.pet();
    renderCount();
    save();
    animatePig();
    const rect = stage.getBoundingClientRect();
    const x = (ev.clientX || rect.left + rect.width / 2) - rect.left;
    const y = (ev.clientY || rect.top + rect.height / 2) - rect.top;
    flyText(x, y, '♥+' + fmt(gain), game.buffLeft() > 0 ? 'gold' : '');
    if (game.shouldSpeak()) { speak(); }
    sound.squeak();
    hopRandomFriend();
    afterChange();
  }

  // ---------- ステージの仲間 ----------
  function miniPigSVG([body, white, ear]) {
    return '<svg viewBox="0 0 120 80" aria-hidden="true">' +
      '<ellipse cx="62" cy="74" rx="44" ry="4" fill="#000" opacity=".12"/>' +
      `<ellipse cx="66" cy="48" rx="50" ry="27" fill="${body}"/>` +
      `<ellipse cx="78" cy="54" rx="28" ry="17" fill="${white}"/>` +
      `<ellipse cx="32" cy="42" rx="22" ry="20" fill="${body}"/>` +
      `<ellipse cx="40" cy="25" rx="8" ry="5.5" fill="${ear}" transform="rotate(-25 40 25)"/>` +
      '<circle cx="24" cy="38" r="3" fill="#2b1d12"/>' +
      '<ellipse cx="12" cy="46" rx="4" ry="3" fill="#e58a9a"/>' +
      '<ellipse cx="36" cy="72" rx="7" ry="3.5" fill="#f2a07b"/>' +
      '<ellipse cx="92" cy="72" rx="8" ry="3.5" fill="#f2a07b"/>' +
      '</svg>';
  }

  function addFriend(arrive) {
    const i = herd.children.length;
    const m = document.createElement('div');
    m.className = 'mini' + (arrive ? ' arrive' : '');
    const bottom = 2 + Math.random() * 22;   // ステージ下からの位置（%）
    m.style.bottom = bottom + '%';
    m.style.left = (4 + Math.random() * 80) + '%';
    m.style.zIndex = bottom < 9 ? 3 : 1;     // 手前の子は本体より前に
    m.style.setProperty('--d', (7 + Math.random() * 7).toFixed(1) + 's');
    m.style.setProperty('--dl', (-Math.random() * 10).toFixed(1) + 's');
    m.style.setProperty('--s', (0.8 + (24 - bottom) / 60).toFixed(2));
    m.innerHTML = miniPigSVG(data.coats[i % data.coats.length]);
    herd.appendChild(m);
  }

  function syncHerd(arrive) {
    const want = Math.min(game.ownedOf('friend'), data.maxHerd);
    while (herd.children.length < want) { addFriend(arrive); }
  }

  function hopRandomFriend() {
    const n = herd.children.length;
    if (!n || Math.random() > 0.35) { return; }
    const svg = herd.children[Math.floor(Math.random() * n)].querySelector('svg');
    if (svg.animate) {
      svg.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }],
        { duration: 300, easing: 'ease-out' }
      );
    }
  }

  // ---------- きんのにんじん ----------
  function scheduleGolden() {
    const g = data.golden;
    setTimeout(() => spawnGolden(false), g.minWait + Math.random() * (g.maxWait - g.minWait));
  }

  // manual が true のとき（動作確認用）は、消えたあと次を予約しない
  function spawnGolden(manual) {
    const b = document.createElement('button');
    b.className = 'golden';
    b.type = 'button';
    b.textContent = '🥕';
    b.setAttribute('aria-label', 'きんのにんじん');
    b.style.left = (8 + Math.random() * 74) + '%';
    b.style.top = (6 + Math.random() * 40) + '%';
    let gone = false;
    const remove = () => {
      if (gone) { return; }
      gone = true;
      b.remove();
      if (!manual) { scheduleGolden(); }
    };
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const r = game.claimGolden();
      const rect = stage.getBoundingClientRect();
      const bx = b.getBoundingClientRect();
      const x = bx.left + bx.width / 2 - rect.left;
      const y = bx.top - rect.top;
      sound.golden();
      if (r.type === 'buff') {
        toast('✨ ごきげんタイム！', (data.golden.buffMs / 1000) + '秒間、ハートが ×' + data.golden.buffMult);
        flyText(x, y, '×' + data.golden.buffMult + '!', 'gold');
        speak();
      } else {
        toast('🥕 きんのにんじん！', 'ハート +' + fmt(r.amount));
        flyText(x, y, '♥+' + fmt(r.amount), 'gold');
        renderCount();
        bump(el, 'bump');
      }
      save();
      remove();
      afterChange();
    });
    stage.appendChild(b);
    setTimeout(remove, data.golden.stayMs);
  }

  // ---------- 実績・お知らせ ----------
  function toast(title, body) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    const b = document.createElement('b');
    b.textContent = title;
    t.appendChild(b);
    t.appendChild(document.createTextNode(body));
    toasts.appendChild(t);
    setTimeout(() => t.remove(), 2800);
  }

  function checkAch() {
    const got = game.checkAchievements();
    got.forEach((a) => toast('🏆 実績解除', a.name));
    if (got.length) { save(); }
  }

  function renderAchList() {
    achList.innerHTML = '';
    data.achievements.forEach((a) => {
      const ok = !!game.stats.ach[a.id];
      const li = document.createElement('li');
      li.className = 'ach' + (ok ? '' : ' locked');
      li.innerHTML = '<span class="ic"></span><span><b></b><small></small></span>';
      li.querySelector('.ic').textContent = ok ? '🏆' : '🔒';
      li.querySelector('b').textContent = ok ? a.name : '？？？';
      li.querySelector('small').textContent = a.desc;
      achList.appendChild(li);
    });
  }

  function openAch() {
    renderAchList();
    achPanel.classList.add('open');
    $('achClose').focus();
  }
  function closeAch() {
    achPanel.classList.remove('open');
    achBtn.focus();
  }
  achBtn.addEventListener('click', openAch);
  $('achClose').addEventListener('click', closeAch);
  achPanel.addEventListener('click', (ev) => { if (ev.target === achPanel) { closeAch(); } });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && achPanel.classList.contains('open')) { closeAch(); }
  });

  function afterChange() {
    checkAch();
    refresh();
  }

  // ---------- 開始 ----------
  buildShop();
  renderSound();
  renderCount();
  syncHerd(false);
  checkAch();
  refresh();
  pig.addEventListener('click', onPet);
  scheduleGolden();

  setInterval(() => {
    if (game.tick(data.tickMs) > 0) {
      renderCount();
      refreshShop();
    }
    refreshRate();
  }, data.tickMs);
  setInterval(() => { checkAch(); refresh(); save(); }, data.autosaveMs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { save(); }
  });

  // 動作確認用の操作（開発中だけ main.js から window に出す）
  return {
    spawnGolden: () => spawnGolden(true)
  };
}
