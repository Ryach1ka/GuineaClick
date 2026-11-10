// mixer.js — 音量ミキサー（BGM / 効果音、それぞれオン・オフと音量）

export function setupMixer({ settings, store, sound }) {
  const $ = (id) => document.getElementById(id);
  const btn = $('mixerBtn');
  const panel = $('mixer');
  const rows = [
    { key: 'bgm', vol: 'bgmVol', toggle: $('bgmBtn'), slider: $('bgmVol'), out: $('bgmVolOut'), on: '🎵', name: 'BGM' },
    { key: 'sound', vol: 'sfxVol', toggle: $('soundBtn'), slider: $('sfxVol'), out: $('sfxVolOut'), on: '🔔', name: '効果音' }
  ];

  function render() {
    rows.forEach((r) => {
      const pct = Math.round(settings[r.vol] * 100);
      r.slider.value = pct;
      r.out.textContent = pct + '%';
      r.toggle.textContent = r.on;
      r.toggle.classList.toggle('off', !settings[r.key]);
      r.toggle.setAttribute('aria-pressed', String(settings[r.key]));
      r.toggle.setAttribute('aria-label', r.name + (settings[r.key] ? 'をオフにする' : 'をオンにする'));
      r.slider.disabled = !settings[r.key];
    });
    const silent = !(settings.bgm && settings.bgmVol > 0) && !(settings.sound && settings.sfxVol > 0);
    btn.textContent = silent ? '🔇' : '🔊';
  }

  rows.forEach((r) => {
    r.toggle.addEventListener('click', () => {
      settings[r.key] = !settings[r.key];
      store.writeSettings(settings);
      render();
      if (r.key === 'bgm') { sound.syncBgm(); } else { sound.squeak(); }
    });
    r.slider.addEventListener('input', () => {
      settings[r.vol] = Number(r.slider.value) / 100;
      render();
      sound.applyVolumes();
    });
    r.slider.addEventListener('change', () => {
      store.writeSettings(settings);
      if (r.key === 'sound') { sound.squeak(); }
    });
  });

  function setOpen(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  }
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(panel.hidden);
  });
  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) { setOpen(false); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) { setOpen(false); btn.focus(); }
  });

  render();
}
