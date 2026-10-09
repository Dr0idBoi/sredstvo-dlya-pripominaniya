/* Средство для припоминания — версия 2: сцены, анимации, интерактив. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);
  // Сцены с закреплением ломаются, если браузер восстанавливает старую позицию прокрутки.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (!location.hash) window.scrollTo(0, 0);

  /* ---------- Плавная прокрутка ---------- */
  var lenis = null; window.__lenis = null;
  if (hasGsap && !reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 });
      else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---------- Прогресс и рельс ---------- */
  var bar = $('.progress__bar');
  function progress() {
    var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? (window.scrollY / max) : 0).toFixed(4) + ')';
  }
  window.addEventListener('scroll', progress, { passive: true });
  progress();
  var railLinks = $$('.rail a');
  if ('IntersectionObserver' in window) {
    var railIO = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        railLinks.forEach(function (a) { a.classList.toggle('is-current', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    railLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) railIO.observe(s); });
  }

  /* ---------- Утилиты разбиения текста ---------- */
  function splitWords(el) {
    var text = el.textContent;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var words = [];
    text.split(' ').forEach(function (w, i, arr) {
      var s = document.createElement('span');
      s.className = 'wd';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = w + (i < arr.length - 1 ? ' ' : '');
      el.appendChild(s);
      words.push(s);
    });
    return words;
  }
  function countUp(el, dur) {
    var to = parseFloat(el.getAttribute('data-count'));
    if (reduce || !hasGsap) { el.textContent = to; return; }
    var o = { v: 0 };
    gsap.to(o, { v: to, duration: dur || 1.6, ease: 'power3.out', onUpdate: function () { el.textContent = Math.round(o.v); } });
  }

  /* ---------- Обложка: частицы ---------- */
  var heroCanvas = $('[data-particles="hero"]');
  var codaCanvas = $('[data-particles="coda"]');
  var hero = null, coda = null;
  var mobile = window.matchMedia('(max-width: 600px)').matches;

  function fontsReady() {
    return (document.fonts && document.fonts.load) ? Promise.all([
      document.fonts.load('600 100px "Cormorant Garamond"'),
      document.fonts.ready
    ]).catch(function () {}) : Promise.resolve();
  }

  if (window.ParticleTitle && heroCanvas) {
    hero = new ParticleTitle(heroCanvas, {
      align: 'left',
      top: mobile ? 0.12 : 0.16,
      maxHeight: mobile ? 0.8 : 0.44,
      still: reduce
    });
    coda = new ParticleTitle(codaCanvas, {
      align: 'center', maxHeight: 0.5, still: reduce
    });
    fontsReady().then(function () {
      hero.build(); coda.build();
      if (reduce) { hero.setNow(1); coda.setNow(1); return; }
      hero.setNow(0); coda.setNow(0);
      setTimeout(function () { hero.setTarget(1); }, 350);
      if (hasGsap) {
        ScrollTrigger.create({
          trigger: '.cover', start: 'top top', end: 'bottom top',
          onUpdate: function (s) { if (s.progress > 0.02) hero.setTarget(1 - s.progress * 1.25); else hero.setTarget(1); }
        });
        ScrollTrigger.create({
          trigger: '.coda', start: 'top 85%', end: 'center 55%',
          onUpdate: function (s) { coda.setTarget(s.progress); }
        });
      }
      if (hasGsap) ScrollTrigger.refresh();
    });
  }

  if (hasGsap && !reduce) {
    gsap.from('.cover__bottom > *', { y: 30, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: .15, delay: 1.4 });
    gsap.to('.cover__bottom', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.cover', start: 'top top', end: '60% top', scrub: true } });
  }

  /* ---------- Заголовки разделов ---------- */
  $$('.reveal-title').forEach(function (h) {
    if (!hasGsap || reduce) return;
    var text = h.textContent;
    h.setAttribute('aria-label', text);
    h.innerHTML = '';
    var inner = [];
    text.split(' ').forEach(function (w, i, arr) {
      var o = document.createElement('span'); o.className = 'rl'; o.setAttribute('aria-hidden', 'true');
      var s = document.createElement('span'); s.textContent = w;
      o.appendChild(s); h.appendChild(o); inner.push(s);
      if (i < arr.length - 1) h.appendChild(document.createTextNode(' '));
    });
    gsap.from(inner, { yPercent: 115, rotate: 4, duration: 1.1, ease: 'power4.out', stagger: .08, scrollTrigger: { trigger: h, start: 'top 85%' } });
  });

  /* ---------- «Припоминание»: слова проступают из размытия ---------- */
  $$('[data-recall]').forEach(function (el) {
    if (!hasGsap || reduce) return;
    var words = splitWords(el);
    gsap.fromTo(words, { opacity: .1, filter: 'blur(7px)' }, {
      opacity: 1, filter: 'blur(0px)', ease: 'none', stagger: .05,
      scrollTrigger: { trigger: el, start: 'top 88%', end: 'bottom 55%', scrub: .6 }
    });
  });

  /* ---------- Три перехода: точка → копии → облако ---------- */
  var dotsG = $('.three__dots');
  if (dotsG) {
    var NS = 'http://www.w3.org/2000/svg', N = 64, dots = [];
    for (var i = 0; i < N; i++) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', 300); c.setAttribute('cy', 300); c.setAttribute('r', 9);
      dotsG.appendChild(c); dots.push(c);
    }
    var gridPos = dots.map(function (_, i) { return { x: 104 + (i % 8) * 56, y: 104 + Math.floor(i / 8) * 56 }; });
    var cloudPos = dots.map(function () {
      var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random());
      return { x: 300 + Math.cos(a) * r * 250, y: 190 + Math.sin(a) * r * 120, s: 2 + Math.random() * 8, o: .25 + Math.random() * .7 };
    });
    var steps = $$('.three__step');
    if (hasGsap && !reduce) {
      gsap.set(steps.slice(1), { autoAlpha: 0, y: 40 });
      var tt = gsap.timeline({ scrollTrigger: { trigger: '.three', start: 'top top', end: '+=260%', pin: true, scrub: .8, refreshPriority: 3 } });
      tt.to({}, { duration: .4 })
        .to(dots, { attr: { cx: function (i) { return gridPos[i].x; }, cy: function (i) { return gridPos[i].y; }, r: 11 }, duration: 1, ease: 'power2.inOut', stagger: { each: .012, from: 'center' } }, 'a')
        .to(steps[0], { autoAlpha: 0, y: -40, duration: .4 }, 'a')
        .to(steps[1], { autoAlpha: 1, y: 0, duration: .4 }, 'a+=.45')
        .to({}, { duration: .4 })
        .to(dots, { attr: { cx: function (i) { return cloudPos[i].x; }, cy: function (i) { return cloudPos[i].y; }, r: function (i) { return cloudPos[i].s; } }, opacity: function (i) { return cloudPos[i].o; }, duration: 1.2, ease: 'power2.inOut', stagger: { each: .01, from: 'random' } }, 'b')
        .to(steps[1], { autoAlpha: 0, y: -40, duration: .4 }, 'b')
        .to(steps[2], { autoAlpha: 1, y: 0, duration: .4 }, 'b+=.5')
        .to(dotsG, { y: -20, duration: .6, ease: 'sine.inOut' });
    } else {
      document.querySelector('.three').classList.add('three--static');
      dots.forEach(function (d, i) { d.setAttribute('cx', gridPos[i].x); d.setAttribute('cy', gridPos[i].y); });
    }
  }

  /* ---------- Главная цитата: слова загораются по одному ---------- */
  var bq = $('[data-words]');
  if (bq && hasGsap && !reduce) {
    var bw = splitWords(bq);
    gsap.set(bw, { opacity: .14 });
    gsap.timeline({ scrollTrigger: { trigger: '.bigquote', start: 'top top', end: '+=140%', pin: true, scrub: .5, refreshPriority: 2 } })
      .to(bw, { opacity: 1, stagger: .1, ease: 'none', duration: .3 })
      .from('.bigquote footer', { opacity: 0, y: 20, duration: .4 });
  }

  /* ---------- Таймлайн: горизонталь + смена носителя ---------- */
  var tl = $('.tl');
  if (tl) {
    var track = $('.tl__track', tl), panels = $$('.tl__panel', tl);
    var counterEl = $('.tl__counter-cur', tl), barEl = $('.tl__bar span', tl);
    var seen = {};
    function setEra(idx) {
      var p = panels[idx]; if (!p) return;
      tl.setAttribute('data-era', p.getAttribute('data-era'));
      if (counterEl) counterEl.textContent = idx + 1;
      if (!seen[idx]) {
        seen[idx] = true;
        $$('[data-count]', p).forEach(function (el) { countUp(el, 1.8); });
        var disk = $('.disk__fg', p);
        if (disk && hasGsap && !reduce) gsap.fromTo(disk, { strokeDasharray: '0 100' }, { strokeDasharray: '94 100', duration: 1.8, ease: 'power3.out' });
        var q = $('.search__q', p);
        if (q && hasGsap && !reduce) typeText(q, q.textContent, 70);
      }
    }
    var mmTl = hasGsap ? gsap.matchMedia() : null;
    if (mmTl) {
      mmTl.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', function () {
        tl.classList.remove('tl--stack');
        setEra(0);
        var dist = function () { return track.scrollWidth - window.innerWidth; };
        var hTween = gsap.to(track, {
          x: function () { return -dist(); }, ease: 'none',
          scrollTrigger: {
            trigger: tl, start: 'top top', end: function () { return '+=' + dist(); },
            pin: true, scrub: 1, invalidateOnRefresh: true, refreshPriority: 1,
            onUpdate: function (s) {
              setEra(Math.round(s.progress * (panels.length - 1)));
              if (barEl) barEl.style.transform = 'scaleX(' + s.progress.toFixed(4) + ')';
            }
          }
        });
        panels.forEach(function (p) {
          var g = $('.tl__ghost', p), m = $('.tl__media', p);
          if (g) gsap.fromTo(g, { xPercent: 30 }, { xPercent: -30, ease: 'none', scrollTrigger: { trigger: p, containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true } });
          if (m) gsap.fromTo(m, { y: 60, rotate: -2, opacity: .3 }, { y: 0, rotate: 0, opacity: 1, ease: 'power2.out', scrollTrigger: { trigger: p, containerAnimation: hTween, start: 'left 85%', end: 'left 30%', scrub: true } });
        });
      });
      mmTl.add('(max-width: 767px), (prefers-reduced-motion: reduce)', function () {
        tl.classList.add('tl--stack');
        panels.forEach(function (p, i) {
          ScrollTrigger.create({ trigger: p, start: 'top 70%', once: true, onEnter: function () { setEra(i); } });
        });
      });
    } else {
      tl.classList.add('tl--stack');
      panels.forEach(function (_, i) { setEra(i); });
    }
  }

  /* ---------- Печать текста ---------- */
  function typeText(el, text, speed, done) {
    el.textContent = '';
    var cur = document.createElement('span'); cur.className = 'cur';
    var node = document.createTextNode('');
    el.appendChild(node); el.appendChild(cur);
    var i = 0;
    (function tick() {
      node.textContent = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, speed + (text[i] === ' ' ? speed : 0) * Math.random());
      else if (done) done(cur);
    })();
  }

  /* ---------- Платон ---------- */
  if (hasGsap && !reduce) {
    gsap.fromTo('.platon__img', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'power2.out', scrollTrigger: { trigger: '.platon', start: 'top 80%', end: 'top 20%', scrub: .6 } });
    gsap.fromTo('.platon__img img', { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.platon', start: 'top 80%', end: 'bottom bottom', scrub: true } });
  }

  /* ---------- Счётчики в обычном потоке ---------- */
  $$('[data-count]').forEach(function (el) {
    if (el.closest('.tl')) return;
    if (!hasGsap) return;
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { countUp(el); } });
  });

  /* ---------- График MIT ---------- */
  var units = $('#units');
  if (units) {
    var rows = $$('.units__row', units);
    rows.forEach(function (row) {
      var box = $('.units__dots', row);
      for (var i = 0; i < 18; i++) { var s = document.createElement('span'); s.style.setProperty('--i', i); box.appendChild(s); }
    });
    var setMode = function (mode) {
      units.setAttribute('data-mode', mode);
      $$('.units__switch button', units).forEach(function (b) { b.setAttribute('aria-checked', String(b.getAttribute('data-mode') === mode)); });
      rows.forEach(function (row) {
        var n = parseInt(row.getAttribute('data-' + mode), 10);
        $$('.units__dots span', row).forEach(function (s, i) { s.classList.toggle('is-on', i < n); });
        $('.units__val', row).textContent = n + ' из 18';
      });
    };
    var btns = $$('.units__switch button', units);
    btns.forEach(function (b, idx) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var n = btns[(idx + 1) % btns.length]; n.focus(); n.click(); e.preventDefault(); }
      });
    });
    if (hasGsap && !reduce) {
      rows.forEach(function (row) { $('.units__val', row).textContent = '0 из 18'; });
      ScrollTrigger.create({ trigger: units, start: 'top 70%', once: true, onEnter: function () { setMode('fail'); } });
      gsap.from('.units__big', { scale: .6, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: units, start: 'top 80%' } });
    } else setMode('fail');
  }

  /* ---------- LED-табло калькулятора ---------- */
  var ledSvg = $('.led__svg');
  var led = null;
  if (ledSvg) {
    // семисегментные цифры: a b c d e f g
    var SEG = {
      a: '6,2 38,2 33,7 11,7', b: '39,3 39,29 34,26 34,8', c: '39,33 39,59 34,54 34,36',
      d: '6,60 38,60 33,55 11,55', e: '5,33 10,36 10,54 5,59', f: '5,3 10,8 10,26 5,29', g: '7,31 12,28 32,28 37,31 32,34 12,34'
    };
    var MAP = { '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg', '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', ' ': '', '-': 'g' };
    var NS2 = 'http://www.w3.org/2000/svg', digits = [];
    for (var d = 0; d < 6; d++) {
      var g = document.createElementNS(NS2, 'g');
      g.setAttribute('transform', 'translate(' + (4 + d * 43) + ',1) skewX(-6)');
      var segs = {};
      Object.keys(SEG).forEach(function (k) {
        var p = document.createElementNS(NS2, 'polygon');
        p.setAttribute('points', SEG[k]); p.setAttribute('class', 'seg');
        g.appendChild(p); segs[k] = p;
      });
      ledSvg.appendChild(g); digits.push(segs);
    }
    led = function (str) {
      str = String(str); while (str.length < 6) str = ' ' + str;
      str = str.slice(-6);
      digits.forEach(function (segs, i) {
        var on = MAP[str[i]] || '';
        Object.keys(segs).forEach(function (k) { segs[k].classList.toggle('on', on.indexOf(k) > -1); });
      });
    };
    var capText = $('.led__cap-text');
    var ledTo = function (to, label) {
      if (capText) capText.textContent = label;
      if (reduce || !hasGsap) { led(to); return; }
      var o = { v: 0 };
      gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', onUpdate: function () { led(Math.round(o.v)); }, overwrite: true });
    };
    led('0');
    if (hasGsap) {
      ScrollTrigger.create({ trigger: '.calc', start: 'top 55%', once: true, onEnter: function () { ledTo(1986, '1986: год пикета'); } });
      var p79 = $('.calc [data-count="79"]');
      if (p79) ScrollTrigger.create({
        trigger: p79, start: 'top 75%',
        onEnter: function () { ledTo(79, '79 исследований в метаанализе Хембри и Дессарта'); },
        onLeaveBack: function () { ledTo(1986, '1986: год пикета'); }
      });
    } else ledTo(1986, '1986: год пикета');
  }

  /* ---------- Толпа: 6000 делегатов и 20 пикетчиков ---------- */
  var crowd = $('.crowd__canvas');
  if (crowd) {
    var cctx = crowd.getContext('2d');
    var COLS = 100, ROWS = 60, TOTAL = COLS * ROWS;
    var order = [], marked = {};
    for (var k = 0; k < TOTAL; k++) order.push(k);
    for (var k2 = TOTAL - 1; k2 > 0; k2--) { var j = Math.floor(Math.random() * (k2 + 1)); var tmp = order[k2]; order[k2] = order[j]; order[j] = tmp; }
    order.slice(0, 20).forEach(function (idx) { marked[idx] = true; });
    var shown = 0, pulseT = 0, crowdRunning = false;
    function drawCrowd() {
      var w = crowd.clientWidth, h = crowd.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (crowd.width !== Math.round(w * dpr)) { crowd.width = Math.round(w * dpr); crowd.height = Math.round(h * dpr); }
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.clearRect(0, 0, w, h);
      var cw = w / COLS, ch = h / ROWS, s = Math.max(1, Math.min(cw, ch) * .55);
      cctx.fillStyle = 'rgba(237,230,218,.32)';
      for (var i = 0; i < shown; i++) {
        var idx = order[i]; if (marked[idx]) continue;
        cctx.fillRect((idx % COLS) * cw + (cw - s) / 2, Math.floor(idx / COLS) * ch + (ch - s) / 2, s, s);
      }
      if (shown >= TOTAL) {
        var glow = 0.5 + 0.5 * Math.sin(pulseT / 300);
        Object.keys(marked).forEach(function (key) {
          var idx = +key, x = (idx % COLS) * cw + cw / 2, y = Math.floor(idx / COLS) * ch + ch / 2;
          cctx.fillStyle = 'rgba(243,217,166,' + (.18 + .25 * glow) + ')';
          cctx.beginPath(); cctx.arc(x, y, s * (2.6 + glow * 1.4), 0, Math.PI * 2); cctx.fill();
          cctx.fillStyle = '#F3D9A6';
          cctx.beginPath(); cctx.arc(x, y, s * 1.3, 0, Math.PI * 2); cctx.fill();
        });
      }
    }
    function runCrowd(ts) {
      pulseT = ts || 0;
      if (shown < TOTAL) shown = Math.min(TOTAL, shown + 140);
      drawCrowd();
      if (crowdRunning) requestAnimationFrame(runCrowd);
    }
    if (reduce || !hasGsap) { shown = TOTAL; drawCrowd(); window.addEventListener('resize', drawCrowd); }
    else {
      ScrollTrigger.create({
        trigger: crowd, start: 'top 85%', end: 'bottom top',
        onToggle: function (s) { crowdRunning = s.isActive; if (crowdRunning) requestAnimationFrame(runCrowd); }
      });
    }
  }

  /* ---------- Отто и Инга ---------- */
  if (hasGsap && !reduce) {
    gsap.from('.otto__card--head', { x: -80, opacity: 0, ease: 'power3.out', scrollTrigger: { trigger: '.otto__pair', start: 'top 85%', end: 'top 45%', scrub: .6 } });
    gsap.from('.otto__card--note', { x: 80, opacity: 0, rotate: 3, ease: 'power3.out', scrollTrigger: { trigger: '.otto__pair', start: 'top 85%', end: 'top 45%', scrub: .6 } });
    var path = $('.otto__path path');
    if (path) {
      var len = path.getTotalLength();
      gsap.fromTo(path, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.otto__pair', start: 'top 70%', end: 'top 35%', scrub: .6, onLeave: function () { path.style.strokeDasharray = '4 6'; }, onEnterBack: function () { path.style.strokeDasharray = len; } } });
    }
  }

  /* ---------- ВШЭ: 87 из 100 ---------- */
  var grid = $('.grid100');
  if (grid) {
    var cells = [];
    for (var q = 0; q < 100; q++) { var cell = document.createElement('span'); if (q < 87) cell.className = 'is-on'; grid.appendChild(cell); cells.push(cell); }
    if (hasGsap && !reduce) {
      gsap.from(cells.filter(function (c) { return c.className; }), { scale: 0, opacity: 0, duration: .5, ease: 'back.out(2)', stagger: { each: .012, grid: [10, 10], from: 'start' }, scrollTrigger: { trigger: grid, start: 'top 80%' } });
      gsap.from('.split span', { flexBasis: '0%', duration: 1.4, ease: 'expo.out', stagger: .2, scrollTrigger: { trigger: '.split', start: 'top 85%' } });
    }
  }

  /* ---------- Ночь: экран загорается, машина печатает ---------- */
  if (hasGsap && !reduce) {
    gsap.fromTo('.night__media img', { filter: 'brightness(0) contrast(1.4)', scale: 1.08 }, { filter: 'brightness(1) contrast(1)', scale: 1, ease: 'power1.out', scrollTrigger: { trigger: '.night', start: 'top 75%', end: 'center center', scrub: .8 } });
  }
  var chat = $('.chat__text');
  if (chat && hasGsap && !reduce) {
    var full = chat.getAttribute('data-type');
    chat.setAttribute('aria-label', full);
    chat.textContent = '';
    ScrollTrigger.create({ trigger: chat, start: 'top 80%', once: true, onEnter: function () { typeText(chat, full, 38); } });
  }

  /* ---------- Дуэль ---------- */
  if (hasGsap && !reduce) {
    gsap.from('.duel__side--chip', { xPercent: -25, opacity: 0, ease: 'power3.out', scrollTrigger: { trigger: '.duel', start: 'top 85%', end: 'top 35%', scrub: .7 } });
    gsap.from('.duel__side--head', { xPercent: 25, opacity: 0, ease: 'power3.out', scrollTrigger: { trigger: '.duel', start: 'top 85%', end: 'top 35%', scrub: .7 } });
  }

  /* ---------- Плавное появление блоков с картинками и видео ---------- */
  if (hasGsap && !reduce) {
    $$('.video--wide, .hse, .calc__photo, .phone').forEach(function (el) {
      gsap.from(el, { y: 70, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
    });
  }

  /* ---------- Телефон ---------- */
  var phone = $('.phone');
  if (phone) {
    var digitsEl = $('.phone__digits', phone), result = $('#check-result'), value = '';
    var render = function () {
      digitsEl.innerHTML = '';
      Array.prototype.forEach.call(value, function (ch) { var s = document.createElement('span'); s.textContent = ch; digitsEl.appendChild(s); });
      if (hasGsap && !reduce && digitsEl.lastChild && renderPop) gsap.from(digitsEl.lastChild, { y: 14, opacity: 0, duration: .25, ease: 'back.out(3)' });
    };
    var renderPop = false;
    var press = function (k) {
      renderPop = k !== 'back';
      if (k === 'back') value = value.slice(0, -1);
      else if (value.length < 13) value += k;
      render();
    };
    $$('[data-key]', phone).forEach(function (b) {
      b.addEventListener('click', function (e) {
        press(b.getAttribute('data-key'));
        if (!reduce) {
          var r = b.getBoundingClientRect(), rip = document.createElement('span'), size = r.width;
          rip.className = 'ripple';
          rip.style.width = rip.style.height = size + 'px';
          rip.style.left = ((e.clientX || r.left + size / 2) - r.left - size / 2) + 'px';
          rip.style.top = ((e.clientY || r.top + size / 2) - r.top - size / 2) + 'px';
          b.appendChild(rip);
          setTimeout(function () { rip.remove(); }, 600);
        }
      });
    });
    phone.addEventListener('keydown', function (e) {
      if (/^[0-9+]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { press('back'); e.preventDefault(); }
    });
    $$('[data-answer]', phone).forEach(function (b) {
      b.addEventListener('click', function () {
        var yes = b.getAttribute('data-answer') === 'yes';
        $$('[data-answer]', phone).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        // цифры улетают в облако
        if (hasGsap && !reduce) {
          $$('span', digitsEl).forEach(function (s, i) {
            var r = s.getBoundingClientRect(), f = document.createElement('span');
            f.className = 'fly'; f.textContent = s.textContent;
            f.style.left = r.left + 'px'; f.style.top = r.top + 'px';
            document.body.appendChild(f);
            gsap.to(f, { y: -window.innerHeight * .6 - Math.random() * 200, x: (Math.random() - .5) * 240, opacity: 0, filter: 'blur(6px)', rotate: (Math.random() - .5) * 90, duration: 1.6 + Math.random() * .6, delay: i * .05, ease: 'power2.in', onComplete: function () { f.remove(); } });
          });
          value = ''; render();
        }
        $('[data-verdict-yes]', result).hidden = !yes;
        $('[data-verdict-no]', result).hidden = yes;
        var first = result.hidden;
        result.hidden = false;
        if (first) {
          result.focus({ preventScroll: true });
          if (hasGsap && !reduce) {
            gsap.from(result.children, { y: 30, opacity: 0, duration: .8, stagger: .08, ease: 'power3.out' });
            gsap.from('.bars__fill', { scaleX: 0, duration: 1.2, stagger: .15, ease: 'expo.out', delay: .3 });
          }
          if (hasGsap) ScrollTrigger.refresh();
        }
      });
    });
  }

  /* ---------- Видео по клику ---------- */
  $$('.video__frame[data-yt]').forEach(function (frame) {
    var btn = $('.video__play', frame);
    btn.addEventListener('click', function () {
      var ifr = document.createElement('iframe');
      ifr.src = 'https://www.youtube-nocookie.com/embed/' + frame.getAttribute('data-yt') + '?autoplay=1&rel=0';
      ifr.title = frame.getAttribute('data-title') || 'Видео';
      ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      ifr.allowFullscreen = true;
      ifr.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.replaceChild(ifr, btn);
      ifr.focus();
    });
  });

  if (hasGsap) {
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }
})();
