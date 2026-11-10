// ui.js — 画面の表示とイベント。最後に読み込み、ゲームを開始する
window.Guinea = window.Guinea || {};

(function () {
  var data = Guinea.data;
  var game = Guinea.game;
  var store = Guinea.save;

  var el = document.getElementById('count');
  var pig = document.getElementById('pig');
  var bubble = document.getElementById('bubble');
  var stage = document.querySelector('.stage');
  var shop = document.getElementById('shop');
  var rateEl = document.getElementById('rate');
  var bubbleTimer = null;
  var buttons = {}; // 品物id → ボタン

  function fmt(n) { return n.toLocaleString('ja-JP'); }
  function save() { store.write(game.state); }

  function renderCount() {
    el.textContent = fmt(game.state.count);
  }

  function refresh() {
    data.items.forEach(function (it) {
      var b = buttons[it.id];
      var c = game.cost(it);
      b.querySelector('.nm').textContent = it.name + ' ×' + game.ownedOf(it.id);
      b.querySelector('.ds').textContent = it.desc;
      b.querySelector('.pr').textContent = '♥ ' + fmt(c);
      b.disabled = game.state.count < c;
    });
    rateEl.textContent = '(毎秒 ' + game.perSec() + ' / タップ +' + game.clickPower() + ')';
  }

  function animatePig() {
    pig.classList.add('press');
    var ear = pig.querySelector('.ear');
    ear.classList.remove('wig');
    void ear.getBoundingClientRect();
    ear.classList.add('wig');
    var svg = pig.querySelector('svg');
    if (svg.animate) {
      svg.animate(
        [{ transform: 'translateY(0)' }, { transform: 'translateY(-12px)' }, { transform: 'translateY(0)' }],
        { duration: 240, easing: 'ease-out' }
      );
    }
    setTimeout(function () { pig.classList.remove('press'); }, 110);
  }

  function flyHeart(ev) {
    var rect = stage.getBoundingClientRect();
    var x = (ev.clientX || rect.left + rect.width / 2) - rect.left;
    var y = (ev.clientY || rect.top + rect.height / 2) - rect.top;
    var h = document.createElement('span');
    h.className = 'fly';
    h.textContent = '♥';
    h.style.left = (x - 12 + (Math.random() * 30 - 15)) + 'px';
    h.style.top = (y - 20) + 'px';
    stage.appendChild(h);
    setTimeout(function () { h.remove(); }, 1000);
  }

  function speak() {
    bubble.textContent = data.words[Math.floor(Math.random() * data.words.length)];
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.classList.remove('show'); }, 900);
  }

  function onPet(ev) {
    game.pet();
    renderCount();
    save();
    animatePig();
    flyHeart(ev);
    if (game.shouldSpeak()) { speak(); }
    refresh();
  }

  function buildShop() {
    data.items.forEach(function (it) {
      var b = document.createElement('button');
      b.className = 'item';
      b.type = 'button';
      b.innerHTML = '<span class="nm"></span><span class="ds"></span><span class="pr"></span>';
      b.addEventListener('click', function () {
        if (game.buy(it)) {
          renderCount();
          save();
          refresh();
        }
      });
      buttons[it.id] = b;
      shop.appendChild(b);
    });
  }

  // --- 開始 ---
  game.init(store.load());
  buildShop();
  renderCount();
  refresh();
  pig.addEventListener('click', onPet);

  setInterval(function () {
    if (game.tick(data.tickMs) > 0) {
      renderCount();
      refresh();
    }
  }, data.tickMs);
  setInterval(save, data.autosaveMs);
})();
