// runui.js — 周回まわりの画面：おやつカードを選ぶパネル・お引っ越しパネル・思い出ショップ

import { burst, confetti, flyIcon, centerOf } from './effects.js';

export function setupRunUI({ data, game, fmt, sound, toast, save, pigSvg, onChange, onMoved }) {
  const $ = (id) => document.getElementById(id);
  const giftBtn = $('giftBtn');
  const giftCount = $('giftCount');
  const draftPanel = $('draftPanel');
  const draftList = $('draftList');
  const draftSub = $('draftSub');
  const rerollBtn = $('rerollBtn');
  const movePanel = $('movePanel');
  const moveGo = $('moveGo');
  let lastFocus = null;

  const tagChip = (t) => `${data.tagInfo[t].icon}${data.tagInfo[t].name}`;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function openPanel(p) {
    lastFocus = document.activeElement;
    p.classList.add('open');
    const f = p.querySelector('button:not([disabled])');
    if (f) { f.focus(); }
  }
  function closePanel(p) {
    p.classList.remove('open');
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  [draftPanel, movePanel].forEach((p) => {
    p.addEventListener('click', (e) => { if (e.target === p) { closePanel(p); } });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') { return; }
    [draftPanel, movePanel].forEach((p) => { if (p.classList.contains('open')) { closePanel(p); } });
  });

  // ---------- 🎁 ボタン ----------
  function refreshGift() {
    const n = game.run.pending;
    giftBtn.hidden = n <= 0;
    giftCount.textContent = n;
    giftBtn.setAttribute('aria-label', `おやつカードをえらぶ（${n}枚）`);
  }
  giftBtn.addEventListener('click', () => { renderDraft(); openPanel(draftPanel); });

  // しきい値を越えたかを見る（ハートが増えたあとに呼ぶ）
  function check() {
    const added = game.checkDrafts();
    if (added > 0) {
      toast('🎁 おやつカードがえらべる！', '右上の 🎁 から選んでね');
      giftBtn.classList.remove('ring');
      void giftBtn.offsetWidth;
      giftBtn.classList.add('ring');
      sound.card();
      save();
    }
    refreshGift();
  }

  // ---------- おやつカードを選ぶ ----------
  function tagCounts() {
    const c = {};
    game.ownedCards().forEach((k) => k.tags.forEach((t) => { c[t] = (c[t] || 0) + 1; }));
    return c;
  }

  function renderDraft() {
    const offer = game.getOffer();
    refreshGift();
    if (!offer) { closePanel(draftPanel); return; }
    const counts = tagCounts();
    const mine = Object.entries(counts).map(([t, n]) => `${data.tagInfo[t].icon}×${n}`).join('　');
    draftSub.textContent = `あと ${game.run.pending} 枚えらべる` + (mine ? `｜いまのおやつ ${mine}` : '');
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
    const left = game.rerollsLeft();
    rerollBtn.hidden = game.metaLevel('reroll') === 0;
    rerollBtn.disabled = left <= 0;
    rerollBtn.textContent = `🔄 ひきなおす（のこり${Math.max(0, left)}）`;
    const first = draftList.querySelector('button');
    if (first && draftPanel.classList.contains('open')) { first.focus(); }
  }

  function pick(c, b) {
    if (!game.pickCard(c.id)) { return; }
    const from = centerOf(b, 0.5, 0.3);
    sound.card();
    burst(from, { count: 16, spread: 90, chars: ['✦', '✧', c.icon] });
    flyIcon(c.icon, from, centerOf(pigSvg, 0.3, 0.45), { size: 2.4 }).then(() => {
      burst(centerOf(pigSvg, 0.5, 0.45), { count: 14, spread: 100 });
    });
    toast(`🎁 ${c.icon} ${c.name}`, c.desc);
    save();
    onChange();
    if (game.run.pending > 0) { renderDraft(); } else { closePanel(draftPanel); refreshGift(); }
  }

  rerollBtn.addEventListener('click', () => {
    if (game.reroll()) { sound.buy(); save(); renderDraft(); }
  });
  $('draftLater').addEventListener('click', () => closePanel(draftPanel));

  // ---------- お引っ越しパネル ----------
  const fmtTime = (ms) => {
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    return h ? `${h}時間${m % 60}分` : `${m}分`;
  };

  let confirmTimer = null;
  function resetConfirm() {
    clearTimeout(confirmTimer);
    moveGo.classList.remove('confirm');
    moveGo.textContent = 'お引っ越しする';
  }

  function renderMove() {
    const r = game.run;
    const mem = game.memoriesFor(r.earned);
    $('runSum').innerHTML =
      `<div><small>この周</small><b>${fmtTime(Date.now() - r.startedAt)}</b></div>` +
      `<div><small>あつめたハート</small><b>♥ ${fmt(r.earned)}</b></div>` +
      `<div><small>毎秒</small><b>${fmt(game.basePerSec())}</b></div>` +
      `<div class="hl"><small>もらえる思い出</small><b>💭 ${fmt(mem)}</b></div>`;
    const can = game.canMove();
    moveGo.disabled = !can;
    $('moveHint').textContent = can
      ? '品物・強化・おやつカードはリセット。思い出・実績・記録は残ります'
      : `この周で ♥${fmt(data.move.minEarned)} あつめるとお引っ越しできます（あと ♥${fmt(data.move.minEarned - r.earned)}）`;

    const cs = game.ownedCards();
    $('myCards').innerHTML = cs.length
      ? cs.map((c) => `<li><span class="ic">${esc(c.icon)}</span><span><b>${esc(c.name)}</b><small>${esc(c.desc)}</small></span></li>`).join('')
      : '<li class="empty">まだありません（ハートをあつめると 🎁 がもらえます）</li>';

    $('memBalance').textContent = `💭 ${fmt(game.meta.memories)}`;
    $('metaShop').innerHTML = data.metaUnlocks.map((u) => {
      const lv = game.metaLevel(u.id);
      const maxLv = Array.isArray(u.cost) ? u.cost.length : 1;
      const cost = game.metaCost(u);
      const label = cost == null ? 'かんりょう' : `💭 ${fmt(cost)}`;
      const dis = cost == null || game.meta.memories < cost;
      return `<li><span class="ic">${esc(u.icon)}</span><span><b>${esc(u.name)}${maxLv > 1 ? ` <em>Lv${lv}/${maxLv}</em>` : ''}</b><small>${esc(u.desc)}</small></span>` +
        `<button type="button" data-meta="${u.id}" ${dis ? 'disabled' : ''}>${label}</button></li>`;
    }).join('');

    const h = game.meta.history;
    $('records').innerHTML =
      `<p>お引っ越し ${game.meta.runs} 回｜最高 ♥${fmt(game.meta.best.earned)}｜最高 毎秒 ${fmt(game.meta.best.perSec)}</p>` +
      (h.length
        ? '<ol>' + h.slice(0, 3).map((x) => `<li>♥${fmt(x.earned)}・${fmtTime(x.ms)}・💭${x.memories}　${x.cards.map((id) => (data.cards.find((c) => c.id === id) || {}).icon || '').join('')}</li>`).join('') + '</ol>'
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
      renderMove();
      onChange();
    }
  });

  $('moveBtn').addEventListener('click', () => { resetConfirm(); renderMove(); openPanel(movePanel); });
  $('moveClose').addEventListener('click', () => closePanel(movePanel));

  moveGo.addEventListener('click', () => {
    if (!game.canMove()) { return; }
    if (!moveGo.classList.contains('confirm')) {
      moveGo.classList.add('confirm');
      moveGo.textContent = 'ほんとうに？ もう一度押すとお引っ越し';
      confirmTimer = setTimeout(resetConfirm, 4000);
      return;
    }
    resetConfirm();
    const rec = game.moveHouse();
    if (!rec) { return; }
    closePanel(movePanel);
    save();
    sound.move();
    confetti(document.body.getBoundingClientRect(), { count: 80 });
    toast('🏡 お引っ越し！', `思い出 💭+${rec.memories}（♥${fmt(rec.earned)}・${fmtTime(rec.ms)}）`);
    onMoved(rec);
    check();
  });

  refreshGift();
  return { check, refreshGift };
}
