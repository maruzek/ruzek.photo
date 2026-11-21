/* Rozpad — final prototype engine.
   1) ASCII dither hero (canvas): resolves into the photo on load, a lens follows the pointer,
      turns back into characters as the hero scrolls away.
   2) Fine ordered-dither photo reveal (8×8 Bayer, ImageData), scroll-driven in both directions
      with a coral "developing" edge band.
   3) Dithered wipes between dark and light zones.
   4) GSAP + ScrollTrigger + SplitText + Lenis choreography.
   Everything degrades: without GSAP the page is fully visible; with prefers-reduced-motion
   photos are static and nothing moves. */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!window.gsap;
  var NIGHT = [7, 8, 11], LIGHT = [242, 242, 243], CORAL = [255, 122, 102];
  function pack(c, a) { return ((a === undefined ? 255 : a) << 24) | (c[2] << 16) | (c[1] << 8) | c[0]; }
  function hex(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* 8×8 Bayer matrix, normalised 0..1 */
  var B8 = (function () {
    var m = [[0]];
    for (var n = 1; n < 8; n *= 2) {
      var s = m.length, r = [];
      for (var y = 0; y < s * 2; y++) { r[y] = []; for (var x = 0; x < s * 2; x++) { var q = (y < s ? 0 : 2) + (x < s ? 0 : 1); var base = [0, 2, 3, 1][q]; r[y][x] = 4 * m[y % s][x % s] + base; } }
      m = r;
    }
    return function (x, y) { return (m[y & 7][x & 7] + .5) / 64; };
  })();

  /* ---------------- Lenis + GSAP wiring ---------------- */
  var lenis = null;
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    if (!reduce && window.Lenis) {
      lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
      document.querySelectorAll('a[href^="#"]').forEach(function (a) {
        a.addEventListener('click', function (e) { var id = a.getAttribute('href'); if (id.length < 2) return; var t = document.querySelector(id); if (!t) return; e.preventDefault(); lenis.scrollTo(t, { offset: 0 }); history.replaceState(null, '', id); });
      });
    }
  }

  /* ---------------- 1) ASCII hero ---------------- */
  var hero = document.querySelector('[data-ascii]');
  var heroState = { load: 1, leave: 0, lx: -9999, ly: -9999, lensOn: 0 };
  (function asciiHero() {
    if (!hero) return;
    var img = hero.querySelector('img'), cv = hero.querySelector('canvas.ascii');
    if (!img || !cv) return;
    if (reduce) { cv.hidden = true; return; }
    var ctx = cv.getContext('2d'), off = document.createElement('canvas'), octx = off.getContext('2d', { willReadFrequently: true });
    var RAMP = ' .,:;-=+*#%@';
    var W, H, cols, rows, cw, ch, dpr, lum = null, thr, chars, ok = true, dirty = true, visible = true, prevBox = null;
    function layout() {
      var r = hero.getBoundingClientRect(); W = r.width; H = r.height;
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      cw = W < 700 ? 8 : 10; ch = Math.round(cw * 1.55);
      cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.font = '500 ' + Math.round(cw * 1.3) + 'px "Geist Mono", ui-monospace, Menlo, monospace';
      ctx.textBaseline = 'top';
      thr = new Float32Array(cols * rows); chars = new Uint8Array(cols * rows);
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) thr[y * cols + x] = B8(x, y) * .78 + Math.random() * .22;
      sample(); dirty = true; prevBox = null;
    }
    function sample() {
      if (!img.naturalWidth) return;
      off.width = cols; off.height = rows;
      var s = Math.max(W / img.naturalWidth, H / img.naturalHeight), sw = W / s, sh = H / s;
      octx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, cols, rows);
      try {
        var d = octx.getImageData(0, 0, cols, rows).data; lum = new Float32Array(cols * rows);
        for (var i = 0; i < cols * rows; i++) { var l = (d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114) / 255; lum[i] = Math.pow(l, .85); chars[i] = Math.min(RAMP.length - 1, Math.floor(lum[i] * RAMP.length)); }
      } catch (e) { ok = false; cv.hidden = true; } /* file:// taints canvas: keep the plain photo */
    }
    function amountAt(x, y, A) {
      if (!heroState.lensOn) return A;
      var px = x * cw + cw / 2, py = y * ch + ch / 2, dx = px - heroState.lx, dy = py - heroState.ly;
      var R = W < 700 ? 110 : 190, d = Math.sqrt(dx * dx + dy * dy) / R;
      var lens = d >= 1 ? 0 : (1 - d * d) * (1 - d * d) * 1.15;
      return Math.max(A, lens * heroState.lensOn);
    }
    function paint(x0, y0, x1, y1, A) {
      ctx.clearRect(x0 * cw, y0 * ch, (x1 - x0) * cw, (y1 - y0) * ch);
      for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
        var i = y * cols + x, a = amountAt(x, y, A), t = thr[i];
        if (t >= a) continue;
        var band = a < 1 && t > a - .09;
        ctx.fillStyle = 'rgba(7,8,11,.9)'; ctx.fillRect(x * cw, y * ch, cw, ch);
        var c = chars[i]; if (Math.random() < .015) c = Math.floor(Math.random() * RAMP.length);
        if (c === 0) continue;
        ctx.fillStyle = band ? '#ff7a66' : 'rgba(233,234,238,' + (.35 + lum[i] * .65).toFixed(2) + ')';
        ctx.fillText(RAMP[c], x * cw + cw * .12, y * ch + ch * .12);
      }
    }
    var lastA = -1, fc = 0;
    function frame() {
      if (ok && lum && visible) {
        var A = Math.max(heroState.load, heroState.leave * 1.15);
        var lensMoving = heroState.lensOn > 0;
        fc++; if (A !== lastA || dirty || (A > 0.001 && fc % 8 === 0)) { paint(0, 0, cols, rows, A); lastA = A; dirty = false; prevBox = null; }
        else if (lensMoving) {
          var R = (W < 700 ? 110 : 190) + cw * 2;
          var box = [clamp(Math.floor((heroState.lx - R) / cw), 0, cols), clamp(Math.floor((heroState.ly - R) / ch), 0, rows), clamp(Math.ceil((heroState.lx + R) / cw), 0, cols), clamp(Math.ceil((heroState.ly + R) / ch), 0, rows)];
          var u = prevBox ? [Math.min(box[0], prevBox[0]), Math.min(box[1], prevBox[1]), Math.max(box[2], prevBox[2]), Math.max(box[3], prevBox[3])] : box;
          paint(u[0], u[1], u[2], u[3], A); prevBox = box;
        } else if (prevBox) { paint(prevBox[0], prevBox[1], prevBox[2], prevBox[3], A); prevBox = null; }
      }
      requestAnimationFrame(frame);
    }
    function start() {
      layout(); requestAnimationFrame(frame);
      if (hasGsap) gsap.to(heroState, { load: 0, duration: 2.4, delay: .25, ease: 'power2.inOut' });
      else { var t0 = performance.now(); (function k(n) { heroState.load = Math.max(0, 1 - (n - t0) / 2400); if (heroState.load > 0) requestAnimationFrame(k); })(t0); }
    }
    if (img.complete && img.naturalWidth) start(); else img.addEventListener('load', start);
    var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 150); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);
    /* lens: pointer on desktop, slow autonomous drift on touch */
    if (fine) {
      var target = { x: -9999, y: -9999 };
      hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); target.x = e.clientX - r.left; target.y = e.clientY - r.top; if (hasGsap) { gsap.to(heroState, { lx: target.x, ly: target.y, duration: .5, ease: 'power3.out', overwrite: 'auto' }); gsap.to(heroState, { lensOn: 1, duration: .4, overwrite: false }); } else { heroState.lx = target.x; heroState.ly = target.y; heroState.lensOn = 1; } });
      hero.addEventListener('pointerleave', function () { if (hasGsap) gsap.to(heroState, { lensOn: 0, duration: .6 }); else heroState.lensOn = 0; });
    } else {
      heroState.lensOn = .9;
      (function drift(t) { heroState.lx = W * (.5 + .32 * Math.sin(t / 3100)); heroState.ly = H * (.38 + .18 * Math.sin(t / 2300)); requestAnimationFrame(drift); })(0);
    }
  })();

  /* ---------------- 2) Fine dither photo reveal ---------------- */
  var dz = [].slice.call(document.querySelectorAll('[data-dz]'));
  dz.forEach(function (el) {
    var cv = el.querySelector('canvas.dz'); if (!cv) return;
    var cover = hex(el.dataset.dzColor || '#07080b');
    var S = { cv: cv, ctx: cv.getContext('2d'), el: el, cols: 0, rows: 0, thr: null, img: null, buf: null, p: -1, hp: 1.3, visible: false,
      cover: pack(cover), band: pack(CORAL), mode: el.dataset.dz };
    el._dz = S;
    if (reduce) { cv.hidden = true; return; }
    if (S.mode === 'hover') {
      el.addEventListener('pointerenter', function () { if (hasGsap) gsap.fromTo(S, { hp: 0 }, { hp: 1.3, duration: .7, ease: 'power2.out' }); });
    }
  });
  function dzLayout(S) {
    var w = S.cv.clientWidth, h = S.cv.clientHeight; if (!w || !h) return false;
    var cell = w < 700 ? 6 : 9;
    S.cols = Math.ceil(w / cell); S.rows = Math.ceil(h / cell);
    S.cv.width = S.cols; S.cv.height = S.rows;
    S.img = S.ctx.createImageData(S.cols, S.rows); S.buf = new Uint32Array(S.img.data.buffer);
    S.thr = new Float32Array(S.cols * S.rows);
    for (var y = 0; y < S.rows; y++) for (var x = 0; x < S.cols; x++) {
      var dx = x / S.cols - .5, dy = y / S.rows - .5;
      S.thr[y * S.cols + x] = B8(x, y) * .7 + Math.sqrt(dx * dx + dy * dy) * .42 + Math.random() * .04;
    }
    S.p = -1; return true;
  }
  function dzPaint(S, p) {
    if (!S.thr && !dzLayout(S)) return;
    if (Math.abs(S.p - p) < .004) return; S.p = p;
    var buf = S.buf, thr = S.thr, n = buf.length, cover = S.cover, band = S.band;
    if (p >= 1.35) { buf.fill(0); }
    else for (var i = 0; i < n; i++) { var t = thr[i]; buf[i] = t > p + .045 ? cover : t > p ? band : 0; }
    S.ctx.putImageData(S.img, 0, 0);
  }
  if (!reduce && dz.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.target._dz) e.target._dz.visible = e.isIntersecting; }); }, { rootMargin: '10% 0px' });
      dz.forEach(function (el) { io.observe(el); });
    } else dz.forEach(function (el) { if (el._dz) el._dz.visible = true; });
    (function loop() {
      var vh = innerHeight;
      dz.forEach(function (el) {
        var S = el._dz; if (!S || !S.visible) return;
        var p;
        if (S.mode === 'hover') p = S.hp;
        else {
          var r = el.getBoundingClientRect();
          var q = (vh - r.top) / (vh + r.height); /* 0 entering bottom → 1 leaving top */
          var enter = clamp(q / .42, 0, 1), leave = S.mode === 'stay' ? 0 : clamp((q - .74) / .26, 0, 1);
          p = enter * 1.4 - leave * 1.4;
        }
        dzPaint(S, p);
      });
      requestAnimationFrame(loop);
    })();
    addEventListener('resize', function () { dz.forEach(function (el) { if (el._dz) el._dz.thr = null; }); });
  }

  /* ---------------- 3) Dithered wipes ---------------- */
  var wipes = [].slice.call(document.querySelectorAll('canvas.dwipe'));
  wipes.forEach(function (cv) {
    var from = pack(hex(cv.dataset.from)), to = pack(hex(cv.dataset.to)), band = pack(CORAL);
    var ctx = cv.getContext('2d'), cols, rows, img, buf, last = -1;
    function lay() { var w = cv.clientWidth, h = cv.clientHeight, cell = w < 700 ? 6 : 8; cols = Math.ceil(w / cell); rows = Math.ceil(h / cell); cv.width = cols; cv.height = rows; img = ctx.createImageData(cols, rows); buf = new Uint32Array(img.data.buffer); last = -1; }
    function paint(q) {
      if (Math.abs(q - last) < .004) return; last = q;
      for (var y = 0; y < rows; y++) { var g = y / (rows - 1); for (var x = 0; x < cols; x++) { var t = B8(x, y) * .55 + g * .45, edge = q * 1.1 - .05; buf[y * cols + x] = t < edge - .03 ? to : t < edge ? (reduce ? to : band) : from; } }
      ctx.putImageData(img, 0, 0);
    }
    lay(); addEventListener('resize', function () { lay(); });
    cv._paint = paint;
    if (reduce) { paint(.55); return; }
  });
  if (!reduce && wipes.length) (function wl() {
    var vh = innerHeight;
    wipes.forEach(function (cv) { var r = cv.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return; cv._paint(clamp((vh - r.top) / (vh * .75), 0, 1)); });
    requestAnimationFrame(wl);
  })();

  /* ---------------- 4) GSAP choreography ---------------- */
  if (!hasGsap) return;
  var mm = gsap.matchMedia();
  mm.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 901px)' }, function (c) {
    if (!c.conditions.motion) return;
    var desk = c.conditions.desktop;

    /* hero → ASCII as it leaves */
    if (hero) ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', scrub: true, onUpdate: function (s) { heroState.leave = s.progress; } });
    if (hero) gsap.to(hero.querySelector('.base'), { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });

    /* name: masked chars */
    var name = document.getElementById('name');
    if (name && window.SplitText) {
      SplitText.create(name, { type: 'chars', mask: 'chars', autoSplit: true, onSplit: function (self) {
        return gsap.from(self.chars, { yPercent: 115, duration: 1.25, ease: 'expo.out', stagger: .045, delay: .55 });
      } });
    }
    gsap.from('.hero .kick > *, .hero .row > *', { y: 24, opacity: 0, duration: .9, ease: 'power3.out', stagger: .08, delay: 1.1 });
    gsap.from('.top', { yPercent: -100, duration: .8, ease: 'power3.out', delay: .9, clearProps: 'transform' });

    /* headings: masked lines */
    if (window.SplitText) document.querySelectorAll('[data-split]').forEach(function (el) {
      SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: function (self) {
        return gsap.from(self.lines, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: .09, scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
      } });
    });
    /* staggered groups */
    document.querySelectorAll('[data-stagger]').forEach(function (g) {
      gsap.from(g.children, { y: 48, opacity: 0, duration: 1, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: g, start: 'top 85%', once: true } });
    });
    document.querySelectorAll('[data-rise]').forEach(function (el) {
      gsap.from(el, { y: 32, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    /* photographic folds: slow scale + caption drift */
    document.querySelectorAll('.fold').forEach(function (f) {
      gsap.fromTo(f.querySelector('.dph'), { scale: 1.16 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.from(f.querySelector('.note'), { y: 80, ease: 'none', scrollTrigger: { trigger: f, start: 'top bottom', end: 'center center', scrub: true } });
      var idx = f.querySelector('.idx b'); if (idx) gsap.from(idx, { yPercent: 60, opacity: 0, ease: 'none', scrollTrigger: { trigger: f, start: 'top 70%', end: 'center center', scrub: true } });
    });

    /* work grid parallax */
    document.querySelectorAll('[data-par]').forEach(function (el) {
      gsap.fromTo(el, { y: Number(el.dataset.par) }, { y: -Number(el.dataset.par), ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* marquee with scroll velocity */
    var track = document.querySelector('.marquee .track');
    if (track) {
      var loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
      ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onUpdate: function (s) {
        var v = clamp(Math.abs(s.getVelocity()) / 600, 0, 5); gsap.to(loop, { timeScale: (s.direction < 0 ? -1 : 1) * (1 + v), duration: .3, overwrite: true });
        gsap.to(loop, { timeScale: s.direction < 0 ? -1 : 1, duration: 1.2, delay: .3, overwrite: false });
      } });
    }

    /* same day: pinned progress on desktop */
    var day = document.querySelector('.day');
    if (day) {
      var steps = day.querySelectorAll('.step'), line = day.querySelector('.progress i');
      var st = { trigger: day, start: desk ? 'top top' : 'top 70%', end: desk ? '+=110%' : 'bottom 60%', scrub: true, pin: desk, onUpdate: function (s) {
        steps.forEach(function (el, i) { el.classList.toggle('is-on', s.progress >= i / steps.length + .02); });
      } };
      gsap.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: st });
    }

    /* footer name */
    var big = document.querySelector('.foot .big');
    if (big && window.SplitText) SplitText.create(big, { type: 'chars', mask: 'chars', autoSplit: true, onSplit: function (self) {
      return gsap.from(self.chars, { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: .03, scrollTrigger: { trigger: big, start: 'top 92%', once: true } });
    } });

    /* header hides on scroll down */
    var top = document.querySelector('.top');
    if (top) ScrollTrigger.create({ start: 120, end: 'max', onUpdate: function (s) { top.classList.toggle('is-hidden', s.direction === 1 && s.scroll() > 200); } });

    /* magnetic buttons + photo cursor (fine pointers only) */
    if (fine) {
      document.querySelectorAll('[data-magnetic]').forEach(function (b) {
        var xTo = gsap.quickTo(b, 'x', { duration: .5, ease: 'power3.out' }), yTo = gsap.quickTo(b, 'y', { duration: .5, ease: 'power3.out' });
        b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .28); yTo((e.clientY - r.top - r.height / 2) * .4); });
        b.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
      });
      var cur = document.querySelector('.cur');
      if (cur) {
        var cx = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3.out' }), cy = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3.out' });
        addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); }, { passive: true });
        document.querySelectorAll('[data-cursor]').forEach(function (el) {
          el.addEventListener('pointerenter', function () { cur.classList.add('on'); });
          el.addEventListener('pointerleave', function () { cur.classList.remove('on'); });
        });
      }
    }
    return function () { /* matchMedia cleanup handled by GSAP */ };
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  addEventListener('load', function () { ScrollTrigger.refresh(); });
})();

/* ---------------- Lightbox (works without GSAP) ---------------- */
(function () {
  var dlg = document.getElementById('lb'); if (!dlg) return;
  var items = [].slice.call(document.querySelectorAll('[data-lb]')), img = dlg.querySelector('img'), cap = dlg.querySelector('.lb-cap'), no = dlg.querySelector('.lb-no');
  var i = 0, opener = null;
  function show(n) {
    i = (n + items.length) % items.length; var t = items[i], src = t.querySelector('img');
    img.src = src.currentSrc || src.src; img.alt = src.alt; img.width = src.naturalWidth || src.width; img.height = src.naturalHeight || src.height;
    cap.textContent = t.dataset.lb; no.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(items.length).padStart(2, '0');
  }
  items.forEach(function (t, n) { t.addEventListener('click', function () { opener = t; show(n); dlg.showModal(); document.documentElement.classList.add('lb-open'); dlg.querySelector('.lb-close').focus(); }); });
  dlg.querySelector('.lb-prev').addEventListener('click', function () { show(i - 1); });
  dlg.querySelector('.lb-next').addEventListener('click', function () { show(i + 1); });
  dlg.querySelector('.lb-close').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', function () { document.documentElement.classList.remove('lb-open'); if (opener && document.contains(opener)) opener.focus(); });
})();
