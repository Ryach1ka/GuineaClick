// ui.js — 画面の表示とイベント

import { formatNumber } from './format.js';
import { createSound } from './sound.js';
import { createPig } from './pig.js';
import { createDecor } from './decor.js';
import { flyIcon, burst, confetti, floatLabel, centerOf } from './effects.js';

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
  const bgmBtn = $('bgmBtn');
  const decor = createDecor($('decor'));

  const buttons = {};      // 品物id → ボタン
  let lockedBtn = null;    // 次に解放される品物の「？？？」ボタン
  let bubbleTimer = null;
  let wasFever = false;
  const settings = store.loadSettings();
  const sound = createSound({ sfxOn: () => settings.sound, bgmOn: () => settings.bgm });
  const pigSvg = $('pigSvg');
  const pigCtl = createPig(pigSvg);

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
    soundBtn.setAttribute('aria-label', settings.sound ? '効果音を消す' : '効果音を出す');
    soundBtn.setAttribute('aria-pressed', String(settings.sound));
    bgmBtn.textContent = '🎵';
    bgmBtn.classList.toggle('off', !settings.bgm);
    bgmBtn.setAttribute('aria-label', settings.bgm ? 'BGMを止める' : 'BGMを流す');
    bgmBtn.setAttribute('aria-pressed', String(settings.bgm));
  }
  soundBtn.addEventListener('click', () => {
    settings.sound = !settings.sound;
    store.writeSettings(settings);
    renderSound();
    sound.squeak();
  });
  bgmBtn.addEventListener('click', () => {
    settings.bgm = !settings.bgm;
    store.writeSettings(settings);
    renderSound();
    sound.syncBgm();
  });
  // ブラウザは最初の操作までは音を出せないので、どこかを触った時点で BGM を始める
  const unlockAudio = () => {
    sound.unlock();
    window.removeEventListener('pointerdown', unlockAudio, true);
    window.removeEventListener('keydown', unlockAudio, true);
  };
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);

  // ---------- ショップ ----------
  function buildShop() {
    data.items.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'item';
      b.type = 'button';
      b.innerHTML = '<span class="ic"><span class="em"></span><span class="cnt"></span></span><span class="nm"></span><span class="ds"></span><span class="pr"></span>';
      b.querySelector('.em').textContent = it.icon;
      b.querySelector('.nm').textContent = it.name;
      b.querySelector('.ds').textContent = it.desc;
      b.addEventListener('click', () => onBuy(it, b));
      buttons[it.id] = b;
      shop.appendChild(b);
    });
    lockedBtn = document.createElement('button');
    lockedBtn.className = 'item locked';
    lockedBtn.type = 'button';
    lockedBtn.disabled = true;
    lockedBtn.innerHTML = '<span class="ic"><span class="em">？</span></span><span class="nm">？？？</span><span class="ds">もっとハートをあつめよう</span><span class="pr"></span>';
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
      const n = game.ownedOf(it.id);
      const cnt = b.querySelector('.cnt');
      cnt.textContent = n > 0 ? fmt(n) : '';
      cnt.hidden = n === 0;
      b.querySelector('.pr').textContent = '♥ ' + fmt(c);
      b.disabled = game.state.count < c;
      b.setAttribute('aria-label', `${it.name}（${n}こ持っている）${it.desc}、ハート${fmt(c)}`);
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
      pigCtl.setFever(fever);
      wasFever = fever;
      refreshShop();
    }
  }

  function refresh() {
    refreshShop();
    refreshRate();
    achBtn.textContent = '🏆 ' + game.achievementCount() + '/' + data.achievements.length;
  }

  // ---------- 買ったときの演出 ----------
  function sayLine(text) {
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 1300);
  }

  function onBuy(it, b) {
    const price = game.cost(it);
    if (!game.buy(it)) { return; }
    const owned = game.ownedOf(it.id);
    renderCount();
    save();

    // ボタン：ぽんと弾んで、所持数バッジもぴょこっと
    bump(b, 'bought');
    bump(b.querySelector('.cnt'), 'pop');
    sound.buy();
    burst(centerOf(b.querySelector('.ic')), { count: 8, spread: 40 });

    // 数字：使ったハートと、増えた力をふわっと出す
    // 使ったハートは大きい数字の右肩、増えた力は「毎秒/タップ」の下に出す
    floatLabel('−♥' + fmt(price), centerOf(el, 1.05, 0.1), 'minus');
    const gainText = it.click ? 'タップ +' + fmt(it.click) : '毎秒 +' + fmt(it.perSec);
    floatLabel(gainText, centerOf(rateEl, 0.5, 1.6), 'plus');

    // アイコンが本体（仲間・飾りはその場所）へ飛んでいって、モルモットが反応する
    const from = centerOf(b.querySelector('.ic'));
    const head = centerOf(pigSvg, 0.2, 0.5);
    flyIcon(it.icon, from, head).then(() => {
      reactTo(it, owned);
    });

    afterChange();
  }

  function reactTo(it, owned) {
    const head = centerOf(pigSvg, 0.2, 0.5);
    const line = it.lines[Math.floor(Math.random() * it.lines.length)];
    sound.land();
    if (it.react === 'chew') {
      pigCtl.chew();
      burst(head, { count: 10 });
    } else if (it.react === 'friend') {
      const added = syncHerd(true);
      pigCtl.popcorn();
      added.forEach((m) => burst(centerOf(m), { count: 10, spread: 50 }));
    } else if (it.react === 'pet') {
      pigCtl.pet(2200);
      burst(centerOf(pigSvg, 0.5, 0.45), { count: 16, chars: ['✦', '✧', '✨'], spread: 110 });
    } else if (it.react === 'decor') {
      const added = decor.sync(game.ownedOf, true);
      pigCtl.popcorn();
      (added.length ? added : [pigSvg]).forEach((d) => burst(centerOf(d), { count: 14, spread: 70 }));
    }
    sayLine(line);

    // キリのいい数になったらお祝い
    if (data.milestones.includes(owned)) {
      sound.fanfare();
      confetti(stage.getBoundingClientRect(), { count: 48 });
      toast('🎉 ' + it.icon + ' ' + it.name + 'が ' + owned + 'こに！', 'すごい！そのちょうし！');
    }
  }

  // ---------- モルモット本体 ----------
  // なでたときの反応。寝ていたら起きる
  function animatePig() {
    pig.classList.add('press');
    bump(pigSvg.querySelector('.ear'), 'wig');
    const woke = pigCtl.pet();
    if (woke) {
      bubble.textContent = 'はっ！';
      bubble.classList.add('show');
      clearTimeout(bubbleTimer);
      bubbleTimer = setTimeout(() => bubble.classList.remove('show'), 900);
    }
    setTimeout(() => pig.classList.remove('press'), 110);
    return woke;
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
    const woke = animatePig();
    const rect = stage.getBoundingClientRect();
    const x = (ev.clientX || rect.left + rect.width / 2) - rect.left;
    const y = (ev.clientY || rect.top + rect.height / 2) - rect.top;
    flyText(x, y, '♥+' + fmt(gain), game.buffLeft() > 0 ? 'gold' : '');
    // 起きた直後は「はっ！」を優先して、ふだんのセリフは出さない
    if (!woke && game.shouldSpeak()) { speak(); }
    sound.squeak();
    hopRandomFriend();
    afterChange();
  }

  // ---------- ステージの仲間 ----------
  // 本体と同じ形を小さく描く（形やグラデーションは index.html の #pigSvg の defs を使い回す）
  function miniPigSVG(coat) {
    return '<svg viewBox="0 60 340 180" aria-hidden="true">' +
      '<ellipse cx="176" cy="229" rx="132" ry="10" fill="url(#pigGroundShade)"/>' +
      '<ellipse cx="96" cy="226" rx="11" ry="5" fill="#f0b29a"/>' +
      '<ellipse cx="252" cy="227" rx="12" ry="5" fill="#f0b29a"/>' +
      `<use href="#pigBodyPath" fill="${coat.fur}"/>` +
      '<g clip-path="url(#pigBodyClip)">' +
        (coat.patch ? '<use href="#pigPatch"/>' : '') +
        '<use href="#pigBodyPath" fill="url(#pigShadeOver)"/>' +
      '</g>' +
      `<use href="#pigEarPath" fill="${coat.ear}"/>` +
      '<ellipse cx="82" cy="124" rx="13" ry="14" fill="#1c110a"/>' +
      '<circle cx="77" cy="118" r="4.5" fill="#fff"/>' +
      '<ellipse cx="66" cy="152" rx="12" ry="7" fill="#f2918a" opacity=".4"/>' +
      '<path d="M35 138 C37 134 44 134 46 138 C44 141.5 37 141.5 35 138 Z" fill="#8a5a4c"/>' +
      '</svg>';
  }

  // 仲間の置き場所。本体の真後ろに隠れないよう、
  //   ・2匹に1匹は「手前の列」（本体より前に描く）
  //   ・残りは「左右の奥」（本体の横の空いているところ）
  // にだけ置く
  function friendSpot(i) {
    if (i % 2 === 0) {
      const k = i / 2;
      return {
        bottom: 1 + (k % 3) * 2.5 + Math.random() * 1.5,
        left: 6 + ((k * 37) % 76) + Math.random() * 4,
        z: 3
      };
    }
    const k = (i - 1) / 2;
    const leftSide = k % 2 === 0;
    return {
      bottom: 10 + (Math.floor(k / 2) % 3) * 5 + Math.random() * 2,
      left: leftSide ? 1 + Math.random() * 10 : 78 + Math.random() * 8,
      z: 1
    };
  }

  function addFriend(arrive) {
    const i = herd.children.length;
    const m = document.createElement('div');
    m.className = 'mini' + (arrive ? ' arrive' : '');
    const spot = friendSpot(i);
    m.style.bottom = spot.bottom + '%';
    m.style.left = spot.left + '%';
    m.style.zIndex = spot.z;
    m.style.setProperty('--d', (7 + Math.random() * 7).toFixed(1) + 's');
    m.style.setProperty('--dl', (-Math.random() * 10).toFixed(1) + 's');
    m.style.setProperty('--s', (0.85 + (24 - spot.bottom) / 70).toFixed(2));
    m.innerHTML = miniPigSVG(data.coats[i % data.coats.length]);
    herd.appendChild(m);
    return m;
  }

  // 所持数まで仲間を増やす。新しく来た子の配列を返す
  function syncHerd(arrive) {
    const want = Math.min(game.ownedOf('friend'), data.maxHerd);
    const added = [];
    while (herd.children.length < want) { added.push(addFriend(arrive)); }
    return added;
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
  decor.sync(game.ownedOf, false);
  checkAch();
  refresh();
  // 体の上をドラッグしてもなでたことになる（60px 動かすごとに1回）
  let drag = null;
  pig.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, dist: 0, moved: false }; });
  pig.addEventListener('pointermove', (e) => {
    if (!drag) { return; }
    drag.dist += Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (drag.dist >= 60) {
      drag.dist = 0;
      drag.moved = true;
      onPet(e);
    }
  });
  // click は pointerup のあとに来るので、少し遅らせて片付ける
  const endDrag = () => setTimeout(() => { drag = null; }, 0);
  pig.addEventListener('pointerup', endDrag);
  pig.addEventListener('pointercancel', endDrag);
  pig.addEventListener('pointerleave', endDrag);
  pig.addEventListener('click', (e) => {
    if (drag && drag.moved) { return; } // ドラッグで撫でた直後のクリックは数えない
    onPet(e);
  });
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
