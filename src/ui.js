// ui.js — 画面の表示とイベント

import { formatNumber } from './format.js';
import { createSound } from './sound.js';
import { createPig } from './pig.js';
import { createDecor } from './decor.js';
import { flyIcon, flyCrumbs, burst, confetti, floatLabel, centerOf, puff } from './effects.js';
import { setupMixer } from './mixer.js';
import { createCounter } from './counter.js';
import { setupRunUI } from './runui.js';
import { setupWinterUI } from './winterui.js';

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
  const decor = createDecor($('decor'));

  const buttons = {};      // 品物id → ボタン
  let lockedBtn = null;    // 次に解放される品物の「？？？」ボタン
  let bubbleTimer = null;
  let wasFever = false;
  let restTaps = 0;        // 作戦タイム中になでた回数（知らせるタイミング用）
  const settings = store.loadSettings();
  const sound = createSound({
    sfxOn: () => settings.sound, bgmOn: () => settings.bgm,
    sfxVol: () => settings.sfxVol, bgmVol: () => settings.bgmVol
  });
  const pigSvg = $('pigSvg');
  const pigCtl = createPig(pigSvg);

  const fmt = (n) => formatNumber(n, data.units);
  const save = () => store.write(game);

  // 大きな数字：なめらかに数え上がり、桁が上がったらお祝い
  const counter = createCounter(el, fmt, {
    onDigitUp: () => {
      sound.digitUp();
      burst(centerOf(el), { count: 22, spread: 120, chars: ['✦', '♥', '✧', '✨'] });
    }
  });
  function renderCount() {
    counter.set(game.state.count);
  }

  function bump(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }

  // ---------- 音（ミキサー） ----------
  setupMixer({ settings, store, sound });
  // ブラウザは最初の操作までは音を出せないので、どこかを触った時点で BGM を始める
  const unlockAudio = () => {
    sound.unlock();
    window.removeEventListener('pointerdown', unlockAudio, true);
    window.removeEventListener('keydown', unlockAudio, true);
  };
  window.addEventListener('pointerdown', unlockAudio, true);
  window.addEventListener('keydown', unlockAudio, true);

  // ---------- 強化（ショップの上の横スクロール列） ----------
  const upgRow = document.createElement('div');
  upgRow.className = 'upgrades';
  upgRow.setAttribute('role', 'group');
  upgRow.setAttribute('aria-label', '強化');
  const upgButtons = {};
  let upgKey = '';

  function refreshUpgrades() {
    const list = game.availableUpgrades();
    const key = list.map((u) => u.id).join(',');
    if (key !== upgKey) {
      upgKey = key;
      upgRow.innerHTML = '';
      list.forEach((u) => {
        const b = upgButtons[u.id] || makeUpgradeButton(u);
        upgRow.appendChild(b);
      });
    }
    upgRow.hidden = list.length === 0;
    list.forEach((u) => { upgButtons[u.id].disabled = !game.canShop() || game.state.count < u.cost; });
  }

  function makeUpgradeButton(u) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'upg';
    b.innerHTML = '<span class="ui"></span><span class="un"></span><span class="ud"></span><span class="up"></span>';
    b.querySelector('.ui').textContent = u.icon;
    b.querySelector('.un').textContent = u.name;
    b.querySelector('.ud').textContent = u.desc;
    b.querySelector('.up').textContent = '♥ ' + fmt(u.cost);
    b.setAttribute('aria-label', `強化：${u.name}、${u.desc}、ハート${fmt(u.cost)}`);
    b.addEventListener('click', () => onBuyUpgrade(u, b));
    upgButtons[u.id] = b;
    return b;
  }

  function onBuyUpgrade(u, b) {
    if (!game.buyUpgrade(u)) { return; }
    const from = centerOf(b);
    renderCount();
    save();
    sound.fanfare();
    floatLabel('−♥' + fmt(u.cost), centerOf(el, 1.05, 0.1), 'minus');
    burst(from, { count: 12, spread: 50 });
    flyIcon(u.icon, from, centerOf(pigSvg, 0.2, 0.5)).then(() => {
      pigCtl.popcorn();
      burst(centerOf(pigSvg, 0.5, 0.45), { count: 18, chars: ['✦', '✧', '✨'], spread: 110 });
      sayLine('パワーアップ！');
    });
    toast('✨ 強化：' + u.name, u.desc);
    afterChange();
  }

  // ---------- ショップ ----------
  function buildShop() {
    shop.appendChild(upgRow);
    data.items.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'item';
      b.type = 'button';
      b.innerHTML = '<span class="ic"><span class="em"></span><span class="cnt"></span></span><span class="nm"></span><span class="ds"></span><span class="pr"></span>';
      b.querySelector('.em').textContent = it.icon;
      b.querySelector('.nm').textContent = it.name;
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

  // 品物1個の効果の説明（強化込み）
  const itemDesc = (it) => (it.click ? 'なでる力 +' + fmt(game.itemClick(it)) : '毎秒 +' + fmt(game.itemPerSec(it)));

  function refreshShop() {
    refreshUpgrades();
    let nextLocked = null;
    data.items.forEach((it) => {
      const b = buttons[it.id];
      const open = game.isUnlocked(it);
      b.hidden = !open;
      if (!open) {
        // 思い出ショップで解放していない品物は「？？？」にも出さない
        if (!nextLocked && game.isAvailable(it)) { nextLocked = it; }
        return;
      }
      const c = game.cost(it);
      const n = game.ownedOf(it.id);
      const cnt = b.querySelector('.cnt');
      cnt.textContent = n > 0 ? fmt(n) : '';
      cnt.hidden = n === 0;
      b.querySelector('.pr').textContent = '♥ ' + fmt(c);
      const desc = itemDesc(it);
      b.querySelector('.ds').textContent = desc;
      b.disabled = !game.canShop() || game.state.count < c;
      b.setAttribute('aria-label', `${it.name}（${n}こ持っている）${desc}、ハート${fmt(c)}`);
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
    // 夜じゃないときは、ハートが増えないことを数字の下にはっきり書く
    if (!game.isNight()) { txt = game.isOver() ? '' : '☀️ 作戦タイム中はハートは増えないよ'; }
    rateEl.textContent = txt;
    rateEl.classList.toggle('resting', !game.isNight());
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
    const gainText = it.click ? 'タップ +' + fmt(game.itemClick(it)) : '毎秒 +' + fmt(game.itemPerSec(it));
    floatLabel(gainText, centerOf(rateEl, 0.5, 1.6), 'plus');

    // アイコンが何個かのかけらになって、毎回ちがう弧を描いて飛んでいく
    //   たべもの → 口元へ「パクッ、パクッ」 / それ以外 → 体のほうへ
    const from = centerOf(b.querySelector('.ic'));
    const isFood = it.react === 'chew';
    const to = isFood ? mouthPos() : centerOf(pigSvg, 0.45, 0.45);
    let first = true;
    flyCrumbs(it.icon, from, to, {
      count: isFood ? 3 + Math.floor(Math.random() * 3) : 2,
      size: isFood ? 1.3 : 1.9,
      onEach: (i) => {
        if (isFood) {
          sound.nom(i);
          gulp();
          burst(mouthPos(), { count: 4, spread: 26, chars: ['✦', '·', '♥'] });
          if (first) { pigCtl.chew(); }
        }
        first = false;
      }
    }).then(() => reactTo(it, owned));

    afterChange();
  }

  // 口元（ヒゲのあたり）の画面座標
  const mouthPos = () => centerOf(pigSvg, 0.12, 0.58);

  // パクッと食べたときに体が少しつぶれる
  function gulp() {
    if (!pigSvg.animate) { return; }
    pigSvg.animate(
      [{ transform: 'scale(1,1)' }, { transform: 'scale(1.04,.95)', offset: 0.4 }, { transform: 'scale(1,1)' }],
      { duration: 160, easing: 'ease-out', composite: 'add' }
    );
  }

  // ときどき出る「大好物！」の当たり演出（見た目だけ）
  function jackpot() {
    sound.jackpot();
    const p = centerOf(pigSvg, 0.4, 0.4);
    burst(p, { count: 26, spread: 150, chars: ['♥', '✦', '♥', '✨'], colors: ['#ff7a9a', '#ffd23f', '#ff9ab0'] });
    confetti(stage.getBoundingClientRect(), { count: 24 });
    floatLabel('大好物！！', centerOf(pigSvg, 0.4, 0.05), 'jackpot');
    pigCtl.popcorn();
  }

  function reactTo(it, owned) {
    const head = centerOf(pigSvg, 0.2, 0.5);
    const line = it.lines[Math.floor(Math.random() * it.lines.length)];
    sound.land();
    if (it.react === 'chew') {
      burst(head, { count: 10 });
      if (Math.random() < 0.15) { jackpot(); sayLine('大好物！！'); return; }
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

  function onPet(ev, { drag = false } = {}) {
    // 夜じゃないとき（作戦タイム）はハートは出ない。♥ の代わりに灰色の 💤 を出して、
    // 何回かなでたら「いまは作戦タイム」と知らせ、次の夜へのボタンを光らせる
    if (!game.isNight()) {
      const rect = stage.getBoundingClientRect();
      const x = (ev.clientX || rect.left + rect.width / 2) - rect.left;
      const y = (ev.clientY || rect.top + rect.height / 2) - rect.top;
      flyText(x, y, '💤', 'rest');
      pig.classList.add('press');
      setTimeout(() => pig.classList.remove('press'), 110);
      sound.rest();
      restTaps += 1;
      if (restTaps === 3 || restTaps % 12 === 0) {
        sayLine('いまは作戦タイム');
        if (game.run.phase === 'break') {
          toast('☀️ いまは作戦タイム', 'なでてもハートは出ないよ。準備ができたら次の夜へ！');
          winterUI.nudge();
        }
      }
      return;
    }
    restTaps = 0;
    const gain = game.pet({ drag });
    renderCount();
    counter.pop(gain);
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
  // 夜の時間（⏸ や作戦タイムでは進まない）で数えて、ときどき出す
  let nightClock = 0;
  let goldenDue = null;
  function scheduleGolden() {
    const g = data.golden;
    const wait = (g.minWait + Math.random() * (g.maxWait - g.minWait)) * game.goldenWaitMult();
    goldenDue = nightClock + wait;
  }
  function clearGolden() {
    stage.querySelectorAll('.golden').forEach((b) => b.remove());
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
      if (!manual && game.isNight()) { scheduleGolden(); }
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
        toast('✨ ごきげんタイム！', (game.buffMs() / 1000) + '秒間、ハートが ×' + data.golden.buffMult);
        flyText(x, y, '×' + data.golden.buffMult + '!', 'gold');
        speak();
      } else {
        toast('🥕 きんのにんじん！', 'ハート +' + fmt(r.amount));
        flyText(x, y, '♥+' + fmt(r.amount), 'gold');
        renderCount();
        counter.pop(r.amount);
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
    // 一度にたくさん出たら古いものから消す
    while (toasts.children.length > 3) { toasts.firstChild.remove(); }
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
    runUI.refreshGift();
    winterUI.render();
  }

  // ---------- 冬ごもり（おやつカード・おうち・結果） ----------
  const runUI = setupRunUI({
    data, game, fmt, sound, toast, save, pigSvg,
    onChange: () => { renderCount(); refresh(); checkAch(); },
    onNewGame: startNewGame,
    onGiveUp: () => {
      const result = game.giveUp();
      save();
      if (result) { clearGolden(); runUI.showEnd(result); }
      afterChange();
    }
  });

  // 新しい冬：仲間・飾りを片付けて、ショップを最初の状態に
  function startNewGame() {
    game.newGame();
    herd.innerHTML = '';
    decor.reset();
    syncHerd(false);
    decor.sync(game.ownedOf, false);
    counter.snap(game.state.count);
    save();
    afterChange();
    sayLine('冬がくる…！');
    pigCtl.popcorn();
    if (game.run.pending > 0) { setTimeout(runUI.openDraft, 500); }
  }

  // ---------- 寒波（メーター・作戦タイム・⏸） ----------
  const winterUI = setupWinterUI({
    game, fmt, sound,
    onStartNight: () => {
      nightClock = 0;
      scheduleGolden();
      save();
      afterChange();
    },
    onPauseChange: () => { lastTick = Date.now(); },
    onEndEarly: () => { handleEvents(game.endNightEarly()); }
  });

  // 夜が終わったとき・冬が終わったときの演出
  function handleEvents(events) {
    events.forEach((ev) => {
      if (ev.type === 'nightEnd') {
        clearGolden();
        goldenDue = null;
        if (ev.ok) {
          // ノルマを払う：ハートが寒波に吸い込まれていく
          sound.paid();
          floatLabel('−♥' + fmt(ev.paid) + ' ノルマ', centerOf(el, 1.05, 0.1), 'minus');
          burst(centerOf(el), { count: 18, spread: 110, chars: ['❄', '✦', '♥'], colors: ['#bfe3ff', '#ffffff', '#ff7a9a'] });
          renderCount();
          if (!game.isOver()) {
            winterUI.show(`❄️ ${ev.night}夜目をのりこえた！`, `ノルマ ♥${fmt(ev.paid)} をはらった`, 'ok');
            sayLine('ぬくぬく〜！');
            pigCtl.popcorn();
            // 夜を越えたら毎回、すぐにおやつを選ぶ（選ぶまで閉じない）
            setTimeout(() => { if (game.run.pending > 0) { runUI.openDraft(); } }, 900);
          }
        } else {
          sound.lose();
          winterUI.show('🥶 さむい…！', `ノルマ ♥${fmt(game.quota(ev.night))} に届かなかった`, 'lose');
          document.body.classList.add('frozen');
          setTimeout(() => document.body.classList.remove('frozen'), 1500);
        }
      }
      if (ev.type === 'gameEnd') {
        setTimeout(() => runUI.showEnd(ev.result), ev.result.win ? 1400 : 1600);
        if (ev.result.win) { sound.move(); confetti(stage.getBoundingClientRect(), { count: 60 }); }
      }
    });
    save();
    afterChange();
  }

  // ---------- 開始 ----------
  buildShop();
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
      onPet(e, { drag: true });
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

  // ---------- 時間を進める ----------
  // 夜のあいだだけ進む。⏸・パネルを開いている間・タブが裏のときは止まる
  // 実際に経った時間で進めるが、一度に進めるのは1秒まで（スリープ明けなどで一気に進まないように）
  let lastTick = Date.now();
  const frozen = () => winterUI.isPaused() || runUI.anyOpen() || achPanel.classList.contains('open') || document.hidden;
  setInterval(() => {
    const t = Date.now();
    const ms = Math.min(Math.max(0, t - lastTick), 1000);
    lastTick = t;
    if (game.isNight() && !frozen()) {
      const before = game.state.count;
      const events = game.update(ms);
      nightClock += ms;
      if (goldenDue != null && nightClock >= goldenDue && game.isNight()) { goldenDue = null; spawnGolden(false); }
      if (game.state.count !== before) { renderCount(); refreshShop(); }
      if (events.length) { handleEvents(events); }
    }
    refreshRate();
    winterUI.render();
  }, data.tickMs);

  // 冬の途中で閉じていたら、⏸ の状態から再開する
  if (game.isNight()) { winterUI.setPaused(true); scheduleGolden(); }
  // 終わった冬の結果を見ている途中で閉じていたら、結果をもう一度出す
  if (game.isOver() && game.run.result) { runUI.showEnd(game.run.result); }
  // おやつを選ぶ途中で閉じていたら、もう一度開く
  if (game.run.phase === 'break' && game.run.pending > 0) { setTimeout(runUI.openDraft, 400); }
  winterUI.render();

  // 寒いと口元から白い息が出る（寒いほど大きく・ひんぱんに）
  let breathAcc = 0;
  setInterval(() => {
    const c = winterUI.coldness();
    if (c < 0.25 || frozen() || pigSvg.classList.contains('sleeping')) { return; }
    breathAcc += c;
    if (breathAcc >= 1) {
      breathAcc = 0;
      puff(centerOf(pigSvg, 0.08, 0.56), c);
    }
  }, 500);

  setInterval(() => { checkAch(); refresh(); save(); }, data.autosaveMs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { save(); }
  });

  // 動作確認用の操作（開発中だけ main.js から window に出す）
  return {
    spawnGolden: () => spawnGolden(true)
  };
}
