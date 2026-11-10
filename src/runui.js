// runui.js — 冬ごもりのパネル：おやつカードを選ぶ・🏡 おうち（思い出ショップと記録）・冬の結果

import { burst, confetti, flyIcon, centerOf } from './effects.js';

export function setupRunUI({ data, game, fmt, sound, toast, save, pigSvg, onChange, onNewGame }) {
  const $ = (id) => document.getElementById(id);
  const giftBtn = $('giftBtn');
  const giftCount = $('giftCount');
  const draftPanel = $('draftPanel');
  const draftList = $('draftList');
  const draftSub = $('draftSub');
  const rerollBtn = $('rerollBtn');
  const homePanel = $('homePanel');
  const endPanel = $('endPanel');
  const panels = [draftPanel, homePanel, endPanel];
  let lastFocus = null;
  let armedAt = 0;      // この時刻まではおやつカードを押せない
  let armTimer = null;

  const tagChip = (t) => `${data.tagInfo[t].icon}${data.tagInfo[t].name}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}分${String(s % 60).padStart(2, '0')}秒`;
  };

  function openPanel(p) {
    lastFocus = document.activeElement;
    p.classList.add('open');
    const f = p.querySelector('button:not([disabled]):not([hidden])');
    if (f) { f.focus(); }
    onChange();
  }
  function closePanel(p) {
    if (!p.classList.contains('open')) { return; }
    p.classList.remove('open');
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
    onChange();
  }
  // おやつカードは選ぶまで、結果パネルは「もう一度」を押すまで閉じない。おうちだけ外側や Esc で閉じられる
  homePanel.addEventListener('click', (e) => { if (e.target === homePanel) { closePanel(homePanel); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && homePanel.classList.contains('open')) { closePanel(homePanel); }
  });
  const anyOpen = () => panels.some((p) => p.classList.contains('open'));

  // ---------- 🎁 ボタン ----------
  function refreshGift() {
    const n = game.run.pending;
    giftBtn.hidden = n <= 0;
    giftCount.textContent = n;
    giftBtn.setAttribute('aria-label', `おやつカードをえらぶ（${n}枚）`);
  }
  giftBtn.addEventListener('click', openDraft);

  // ---------- おやつカードを選ぶ ----------
  function tagCounts() {
    const c = {};
    game.ownedCards().forEach((k) => k.tags.forEach((t) => { c[t] = (c[t] || 0) + 1; }));
    return c;
  }

  function openDraft() {
    if (!game.getOffer()) { refreshGift(); return; }
    renderDraft();
    openPanel(draftPanel);
  }

  function renderDraft() {
    const offer = game.getOffer();
    refreshGift();
    if (!offer) { closePanel(draftPanel); return; }
    const counts = tagCounts();
    const mine = Object.entries(counts).map(([t, n]) => `${data.tagInfo[t].icon}×${n}`).join('　');
    draftSub.textContent = (game.run.pending > 1 ? `あと ${game.run.pending} 枚えらべる` : '1枚えらんでね') + (mine ? `｜いまのおやつ ${mine}` : '');
    draftList.innerHTML = '';
    offer.forEach((c, i) => {
      const syn = c.tags.filter((t) => counts[t]);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `draft-item ${c.rarity}` + (syn.length ? ' synergy' : '');
      b.style.animationDelay = (i * 70) + 'ms';
      b.innerHTML =
        `<span class="di-rar">${c.rarity === 'rare' ? 'レア' : 'ふつう'}</span>` +
        `<span class="di-ic">${esc(c.icon)}</span>` +
        `<span class="di-nm">${esc(c.name)}</span>` +
        `<span class="di-ds">${esc(c.desc)}</span>` +
        `<span class="di-tags">${c.tags.map((t) => `<span>${esc(tagChip(t))}</span>`).join('')}</span>` +
        (syn.length ? `<span class="di-syn">シナジー！ ${syn.map((t) => data.tagInfo[t].icon + '×' + counts[t]).join(' ')}</span>` : '');
      b.setAttribute('aria-label', `${c.rarity === 'rare' ? 'レア、' : ''}${c.name}：${c.desc}`);
      b.addEventListener('click', () => pick(c, b));
      draftList.appendChild(b);
    });
    // 開いた直後の 0.7 秒は押せない（夜の終わりまで連打していて、うっかり選ばないように）
    armedAt = Date.now() + 700;
    draftList.classList.add('arming');
    clearTimeout(armTimer);
    armTimer = setTimeout(() => draftList.classList.remove('arming'), 700);
    const left = game.rerollsLeft();
    rerollBtn.hidden = game.metaLevel('reroll') === 0;
    rerollBtn.disabled = left <= 0;
    rerollBtn.textContent = `🔄 ひきなおす（のこり${Math.max(0, left)}）`;
    const first = draftList.querySelector('button');
    if (first && draftPanel.classList.contains('open')) { first.focus(); }
  }

  function pick(c, b) {
    if (Date.now() < armedAt) { return; }
    if (!game.pickCard(c.id)) { return; }
    const from = centerOf(b, 0.5, 0.3);
    sound.card();
    burst(from, { count: 16, spread: 90, chars: ['✦', '✧', c.icon] });
    flyIcon(c.icon, from, centerOf(pigSvg, 0.3, 0.45), { size: 2.4 }).then(() => {
      burst(centerOf(pigSvg, 0.5, 0.45), { count: 14, spread: 100 });
    });
    toast(`🎁 ${c.icon} ${c.name}`, c.desc);
    save();
    if (game.run.pending > 0) { renderDraft(); } else { closePanel(draftPanel); refreshGift(); }
    onChange();
  }

  rerollBtn.addEventListener('click', () => {
    if (game.reroll()) { sound.buy(); save(); renderDraft(); }
  });

  // ---------- 🏡 おうち（思い出ショップと記録） ----------
  function renderHome() {
    const cs = game.ownedCards();
    $('myCards').innerHTML = cs.length
      ? cs.map((c) => `<li><span class="ic">${esc(c.icon)}</span><span><b>${esc(c.name)}</b><small>${esc(c.desc)}</small></span></li>`).join('')
      : '<li class="empty">まだありません（夜を越えると 🎁 がもらえます）</li>';

    $('memBalance').textContent = `💭 ${fmt(game.meta.memories)}`;
    $('metaShop').innerHTML = data.metaUnlocks.map((u) => {
      const lv = game.metaLevel(u.id);
      const maxLv = Array.isArray(u.cost) ? u.cost.length : 1;
      const cost = game.metaCost(u);
      const label = cost == null ? 'かんりょう' : `💭 ${fmt(cost)}`;
      const dis = cost == null || game.meta.memories < cost;
      return `<li class="${cost == null ? 'done' : ''}"><span class="ic">${esc(u.icon)}</span><span><b>${esc(u.name)}${maxLv > 1 ? ` <em>Lv${lv}/${maxLv}</em>` : ''}</b><small>${esc(u.desc)}</small></span>` +
        `<button type="button" data-meta="${u.id}" ${dis ? 'disabled' : ''}>${label}</button></li>`;
    }).join('');

    const m = game.meta;
    const h = m.history;
    $('records').innerHTML =
      `<p>挑戦 ${m.games} 回｜冬ごもり成功 ${m.clears} 回｜最高 ${m.bestNights} 夜｜最高 ♥${fmt(m.best.earned)}</p>` +
      (h.length
        ? '<ol>' + h.slice(0, 5).map((x) => `<li>${x.win ? '🌸 成功' : `🥶 ${x.nights}夜`}・♥${fmt(x.earned)}・💭${x.memories}　${x.cards.map((id) => (data.cards.find((c) => c.id === id) || {}).icon || '').join('')}</li>`).join('') + '</ol>'
        : '<p class="empty">まだ記録はありません</p>');
  }

  $('metaShop').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-meta]');
    if (!b) { return; }
    const u = data.metaUnlocks.find((x) => x.id === b.dataset.meta);
    if (game.buyMeta(u)) {
      sound.fanfare();
      burst(centerOf(b), { count: 12, spread: 60 });
      toast(`${u.icon} ${u.name}`, '思い出ショップで手に入れた！');
      save();
      renderHome();
      onChange();
    }
  });

  // 🏡 は ☰ メニューから開く（menu.js）
  function openHome() { renderHome(); openPanel(homePanel); }
  $('homeClose').addEventListener('click', () => closePanel(homePanel));

  // ---------- 冬の結果 ----------
  function showEnd(result) {
    const win = result.win;
    $('endIcon').textContent = win ? '🌸' : '🥶';
    $('endTitle').textContent = win ? '冬ごもり成功！春がきた！' : '寒さに負けちゃった…';
    $('endSub').textContent = win
      ? 'みんなでぬくぬく、冬を越えられました'
      : `${result.nights + 1}夜目のノルマ ♥${fmt(game.quota(result.nights + 1))} に届かなかった`;
    $('endSum').innerHTML =
      `<div><small>越えた夜</small><b>${result.nights} / ${game.nightCount()}</b></div>` +
      `<div><small>あつめたハート</small><b>♥ ${fmt(result.earned)}</b></div>` +
      `<div><small>夜の時間</small><b>${fmtTime(result.ms)}</b></div>` +
      `<div class="hl"><small>もらった思い出</small><b>💭 +${result.memories}</b></div>`;
    $('endMem').textContent = `思い出 💭${fmt(game.meta.memories)}　🏡 思い出ショップで次の冬を楽にできます`;
    openPanel(endPanel);
    if (win) { confetti(document.body.getBoundingClientRect(), { count: 90 }); }
  }

  $('endRetry').addEventListener('click', () => {
    closePanel(endPanel);
    onNewGame();
  });
  $('endHome').addEventListener('click', () => { renderHome(); homePanel.classList.add('open'); });

  refreshGift();
  // 新しい冬を始めるときに、前の冬のカード選択や結果を閉じる
  function closeRunPanels() {
    [draftPanel, endPanel].forEach((p) => p.classList.remove('open'));
  }

  return { refreshGift, openDraft, showEnd, openHome, anyOpen, closeRunPanels };
}
