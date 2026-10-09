/* Заголовок из частиц.
   Текст рисуется на скрытом холсте, из его пикселей берутся «дома» частиц.
   formed = 0 — частицы висят облаком, formed = 1 — собраны в буквы. */
(function () {
  'use strict';

  function rand(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function ParticleTitle(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.o = Object.assign({
      lines: ['Средство для', 'припоминания'],
      align: 'left',           // left | center
      top: 0.16,               // доля высоты, где начинается текст
      maxHeight: 0.46,         // доля высоты под текст
      color: '236,238,241',
      accent: '200,150,74',
      accentShare: 0.06,
      font: '600 {s}px "Cormorant Garamond", serif',
      interactive: true,
      still: false
    }, opts || {});
    this.formed = 0;        // текущее значение
    this.target = 0;        // к чему стремимся
    this.mouse = { x: -1e4, y: -1e4, on: false };
    this.particles = [];
    this.running = false;
    this.visible = true;
    this.t = 0;
    this._loop = this._loop.bind(this);
    this._bind();
  }

  ParticleTitle.prototype._bind = function () {
    var self = this, c = this.canvas;
    if (this.o.interactive) {
      var pos = function (e) {
        var r = c.getBoundingClientRect();
        self.mouse.x = e.clientX - r.left;
        self.mouse.y = e.clientY - r.top;
        self.mouse.on = true;
      };
      c.addEventListener('pointermove', pos);
      c.addEventListener('pointerdown', function (e) { pos(e); self.burst(self.mouse.x, self.mouse.y); });
      c.addEventListener('pointerleave', function () { self.mouse.on = false; self.mouse.x = self.mouse.y = -1e4; });
    }
    var to;
    window.addEventListener('resize', function () {
      clearTimeout(to);
      to = setTimeout(function () { self.build(); }, 180);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        self.visible = en[0].isIntersecting;
        if (self.visible) self.start();
      }, { rootMargin: '100px' }).observe(c);
    }
  };

  ParticleTitle.prototype.build = function () {
    var c = this.canvas, o = this.o;
    var w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w; this.h = h; this.dpr = dpr;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);

    // Подбираем кегль: самая длинная строка занимает до 90% ширины.
    var off = document.createElement('canvas');
    off.width = w; off.height = h;
    var g = off.getContext('2d');
    var probe = 100;
    g.font = o.font.replace('{s}', probe);
    var widest = 0;
    o.lines.forEach(function (l) { widest = Math.max(widest, g.measureText(l).width); });
    var mobile = w < 640;
    var padX = o.align === 'left' ? Math.max(16, w * (mobile ? 0.05 : 0.055)) : 0;
    var size = probe * ((w - padX * 2) * (mobile ? 0.98 : 0.9)) / widest;
    var lineH = size * 0.9;
    var maxH = h * o.maxHeight;
    if (lineH * o.lines.length > maxH) { size *= maxH / (lineH * o.lines.length); lineH = size * 0.9; }
    this.size = size;

    g.clearRect(0, 0, w, h);
    g.fillStyle = '#fff';
    g.textBaseline = 'alphabetic';
    g.font = o.font.replace('{s}', Math.round(size));
    g.textAlign = o.align;
    var x0 = o.align === 'left' ? padX : w / 2;
    var y0 = o.align === 'left' ? h * o.top + size * 0.78 : (h - lineH * o.lines.length) / 2 + size * 0.78;
    o.lines.forEach(function (l, i) { g.fillText(l, x0, y0 + i * lineH); });
    this.textBox = { top: y0 - size * 0.78, bottom: y0 + (o.lines.length - 1) * lineH + size * 0.25 };

    var cap = mobile ? 2300 : 5200;
    var gap = Math.max(2, Math.round(size / (mobile ? 22 : 30)));
    var data = g.getImageData(0, 0, w, h).data;
    var pts;
    for (;;) {
      pts = [];
      for (var y = 0; y < h; y += gap) {
        for (var x = 0; x < w; x += gap) {
          if (data[(y * w + x) * 4 + 3] > 140) pts.push(x, y);
        }
      }
      if (pts.length / 2 <= cap) break;
      gap += 1;
    }
    this.gap = gap;

    var old = this.particles, list = [];
    for (var i = 0; i < pts.length; i += 2) {
      var p = old[i / 2] || {};
      p.hx = pts[i]; p.hy = pts[i + 1];
      // облако: вытянутый эллипс над текстом
      p.cx = w * 0.5 + gauss() * w * 0.48;
      p.cy = h * 0.2 + gauss() * h * 0.22;
      p.ph = rand(0, Math.PI * 2);
      p.d = 0.55 * (p.hx / w) + 0.45 * Math.random();
      p.s = rand(0.85, 1.3) * Math.max(1.4, gap * 0.72);
      p.a = Math.random() < o.accentShare;
      if (p.x === undefined) { p.x = p.cx; p.y = p.cy; p.vx = 0; p.vy = 0; }
      list.push(p);
    }
    this.particles = list;
    if (this.o.still) this.draw();
  };

  ParticleTitle.prototype.burst = function (mx, my) {
    this.particles.forEach(function (p) {
      var dx = p.x - mx, dy = p.y - my, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < 220) { var f = (220 - d) / 220 * 14; p.vx += dx / d * f; p.vy += dy / d * f; }
    });
  };

  ParticleTitle.prototype.setTarget = function (v) { this.target = clamp(v, 0, 1); this.start(); };
  ParticleTitle.prototype.setNow = function (v) {
    this.target = this.formed = clamp(v, 0, 1);
    var self = this;
    this.particles.forEach(function (p) { var f = self._fi(p); p.x = p.cx + (p.hx - p.cx) * f; p.y = p.cy + (p.hy - p.cy) * f; });
    this.start();
  };

  ParticleTitle.prototype._fi = function (p) {
    return ease(clamp(this.formed * 1.7 - p.d * 0.7, 0, 1));
  };

  ParticleTitle.prototype.start = function () {
    if (this.o.still) { this.draw(); return; }
    if (this.running || !this.visible) return;
    this.running = true;
    requestAnimationFrame(this._loop);
  };

  ParticleTitle.prototype._loop = function (ts) {
    if (!this.visible) { this.running = false; return; }
    this.t = ts || 0;
    this.formed += (this.target - this.formed) * 0.06;
    if (Math.abs(this.target - this.formed) < 0.0005) this.formed = this.target;
    this.step();
    this.draw();
    requestAnimationFrame(this._loop);
  };

  ParticleTitle.prototype.step = function () {
    var m = this.mouse, R = Math.max(70, this.size * 0.75), R2 = R * R, t = this.t * 0.001;
    for (var i = 0, n = this.particles.length; i < n; i++) {
      var p = this.particles[i];
      var f = this._fi(p);
      var drift = (1 - f);
      var tx = p.cx + (p.hx - p.cx) * f + Math.sin(t * 0.7 + p.ph) * 14 * drift;
      var ty = p.cy + (p.hy - p.cy) * f + Math.cos(t * 0.5 + p.ph) * 10 * drift - drift * 6;
      if (m.on) {
        var dx = p.x - m.x, dy = p.y - m.y, d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          var d = Math.sqrt(d2) || 1, k = (R - d) / R;
          p.vx += dx / d * k * 2.4;
          p.vy += dy / d * k * 2.4;
        }
      }
      p.vx = (p.vx + (tx - p.x) * 0.075) * 0.8;
      p.vy = (p.vy + (ty - p.y) * 0.075) * 0.8;
      p.x += p.vx; p.y += p.vy;
    }
  };

  ParticleTitle.prototype.draw = function () {
    var ctx = this.ctx, dpr = this.dpr || 1, o = this.o;
    if (!this.w) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    var t = this.t * 0.001;
    var main = 'rgb(' + o.color + ')', acc = 'rgb(' + o.accent + ')';
    for (var pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pass ? acc : main;
      for (var i = 0, n = this.particles.length; i < n; i++) {
        var p = this.particles[i];
        if (p.a !== !!pass) continue;
        var f = o.still ? 1 : this._fi(p);
        var tw = 0.75 + 0.25 * Math.sin(t * 2.2 + p.ph * 3);
        ctx.globalAlpha = (0.28 + 0.72 * f) * (f > 0.98 ? 1 : tw);
        var s = p.s * (0.7 + 0.3 * f);
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
    ctx.globalAlpha = 1;
  };

  window.ParticleTitle = ParticleTitle;
})();
