/* Средство для припоминания — интерактив лонгрида. Без библиотек. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Прогресс чтения ---------- */
  var bar = document.querySelector('.progress__bar');
  var toc = document.querySelector('.toc');
  var cover = document.getElementById('cover');
  var ticking = false;

  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? h.scrollTop / max : 0;
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (toc && cover) toc.classList.toggle('toc--light', cover.getBoundingClientRect().bottom < 60);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Содержание ---------- */
  var tocBtn = document.querySelector('.toc__toggle');
  var tocList = document.getElementById('toc-list');
  function closeToc() { tocList.hidden = true; tocBtn.setAttribute('aria-expanded', 'false'); }
  if (tocBtn && tocList) {
    tocBtn.addEventListener('click', function () {
      var open = tocList.hidden;
      tocList.hidden = !open;
      tocBtn.setAttribute('aria-expanded', String(open));
    });
    tocList.addEventListener('click', function (e) { if (e.target.closest('a')) closeToc(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !tocList.hidden) { closeToc(); tocBtn.focus(); } });
    document.addEventListener('click', function (e) { if (!e.target.closest('.toc')) closeToc(); });

    var links = tocList.querySelectorAll('a');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      links.forEach(function (a) { var s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });
    }
  }

  /* ---------- Забывающийся заголовок ----------
     Буквы постепенно бледнеют, как забытое слово.
     Курсор или касание возвращают их: это и есть «припоминание». */
  var title = document.querySelector('[data-forget]');
  if (title) {
    var text = title.textContent.trim();
    title.setAttribute('aria-label', text);
    title.textContent = '';
    var chars = [];
    text.split(' ').forEach(function (word, wi, arr) {
      var w = document.createElement('span');
      w.className = 'w';
      w.setAttribute('aria-hidden', 'true');
      Array.prototype.forEach.call(word, function (c) {
        var s = document.createElement('span');
        s.className = 'ch';
        s.textContent = c;
        w.appendChild(s);
        chars.push(s);
      });
      title.appendChild(w);
      if (wi < arr.length - 1) title.appendChild(document.createTextNode(' '));
    });

    if (!reduceMotion) {
      var hint = document.querySelector('.cover__hint');
      var timers = new Map();

      // Детерминированный порядок «забывания»: каждая вторая-третья буква, вразнобой.
      var order = chars.map(function (c, i) { return { c: c, k: (i * 7919) % 23 }; })
        .sort(function (a, b) { return a.k - b.k; })
        .slice(0, Math.round(chars.length * 0.55))
        .map(function (o) { return o.c; });

      function forget(c, delay) {
        c.style.transitionDelay = (delay || 0) + 'ms';
        c.classList.remove('is-back');
        c.classList.add('is-faded');
      }
      function recall(c) {
        if (!c.classList.contains('is-faded') && !c.classList.contains('is-back')) return;
        c.style.transitionDelay = '0ms';
        c.classList.remove('is-faded');
        c.classList.add('is-back');
        clearTimeout(timers.get(c));
        timers.set(c, setTimeout(function () { forget(c, 0); }, 2600));
      }

      setTimeout(function () {
        order.forEach(function (c, i) { forget(c, i * 90); });
        if (hint) setTimeout(function () { hint.classList.add('is-on'); }, order.length * 90 + 600);
      }, 1400);

      title.addEventListener('pointermove', function (e) {
        chars.forEach(function (c) {
          var r = c.getBoundingClientRect();
          var dx = e.clientX - (r.left + r.width / 2);
          var dy = e.clientY - (r.top + r.height / 2);
          if (dx * dx + dy * dy < 9000) recall(c);
        });
      });
      title.addEventListener('click', function () { order.forEach(recall); });
    }
  }

  /* ---------- Клавиатура телефона ---------- */
  var phone = document.querySelector('.phone');
  if (phone) {
    var digitsEl = phone.querySelector('.phone__digits');
    var result = document.getElementById('check-result');
    var value = '';

    function render() { digitsEl.textContent = value; }
    function press(k) {
      if (k === 'back') value = value.slice(0, -1);
      else if (value.length < 14) value += k;
      render();
    }
    phone.querySelectorAll('[data-key]').forEach(function (b) {
      b.addEventListener('click', function () { press(b.getAttribute('data-key')); });
    });
    phone.addEventListener('keydown', function (e) {
      if (/^[0-9+]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('back'); e.preventDefault(); }
    });

    phone.querySelectorAll('[data-answer]').forEach(function (b) {
      b.addEventListener('click', function () {
        var yes = b.getAttribute('data-answer') === 'yes';
        phone.querySelectorAll('[data-answer]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        result.querySelector('[data-verdict-yes]').hidden = !yes;
        result.querySelector('[data-verdict-no]').hidden = yes;
        var wasHidden = result.hidden;
        result.hidden = false;
        if (wasHidden) result.focus({ preventScroll: true });
        result.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
      });
    });
  }

  /* ---------- График: 18 квадратов на группу ---------- */
  var units = document.getElementById('units');
  if (units) {
    var rows = units.querySelectorAll('.units__row');
    rows.forEach(function (row) {
      var box = row.querySelector('.units__dots');
      for (var i = 0; i < 18; i++) {
        var s = document.createElement('span');
        s.style.setProperty('--i', i);
        box.appendChild(s);
      }
    });
    function setMode(mode) {
      units.setAttribute('data-mode', mode);
      units.querySelectorAll('[data-mode]').forEach(function (b) {
        if (b.tagName === 'BUTTON') b.setAttribute('aria-checked', String(b.getAttribute('data-mode') === mode));
      });
      rows.forEach(function (row) {
        var n = parseInt(row.getAttribute('data-' + mode), 10);
        row.querySelectorAll('.units__dots span').forEach(function (s, i) { s.classList.toggle('is-on', i < n); });
        row.querySelector('.units__val').textContent = n + ' из 18';
      });
    }
    var modeBtns = units.querySelectorAll('.units__switch button');
    modeBtns.forEach(function (b, idx) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          var next = modeBtns[(idx + 1) % modeBtns.length];
          next.focus(); next.click(); e.preventDefault();
        }
      });
    });
    setMode('fail');
  }

  /* ---------- 87 из 100 ---------- */
  var grid = document.querySelector('.grid100');
  if (grid) {
    for (var g = 0; g < 100; g++) {
      var cell = document.createElement('span');
      if (g < 87) cell.className = 'is-on';
      grid.appendChild(cell);
    }
  }

  /* ---------- Таймлайн ---------- */
  var track = document.querySelector('.timeline__track');
  if (track) {
    var btns = document.querySelectorAll('.tl-btn');
    function step() {
      var first = track.querySelector('.era');
      return first ? first.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : 300;
    }
    function updateBtns() {
      var max = track.scrollWidth - track.clientWidth - 2;
      btns[0].disabled = track.scrollLeft <= 2;
      btns[1].disabled = track.scrollLeft >= max;
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        track.scrollBy({ left: step() * parseInt(b.getAttribute('data-dir'), 10), behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
    track.addEventListener('scroll', function () { requestAnimationFrame(updateBtns); }, { passive: true });
    window.addEventListener('resize', updateBtns);
    updateBtns();
  }

  /* ---------- Видео: YouTube грузится только по клику ---------- */
  document.querySelectorAll('.video__frame[data-yt]').forEach(function (frame) {
    var btn = frame.querySelector('.video__play');
    btn.addEventListener('click', function () {
      var id = frame.getAttribute('data-yt');
      var ifr = document.createElement('iframe');
      ifr.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      ifr.title = frame.getAttribute('data-title') || 'Видео';
      ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      ifr.allowFullscreen = true;
      ifr.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.replaceChild(ifr, btn);
      ifr.focus();
    });
  });
})();
