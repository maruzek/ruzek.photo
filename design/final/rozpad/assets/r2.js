/* Round 2 shared behaviour: inquiry form with live estimate + ordered-dither photo reveal.
   Prototype only: nothing is sent. Every effect has a prefers-reduced-motion fallback. */
(function(){
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Inquiry form + estimate ---------- */
  var form = document.getElementById('inq');
  if (form) {
    var $ = function(id){ return document.getElementById(id); };
    var nf = new Intl.NumberFormat('cs-CZ');
    var rules = {
      'inq-name': function(v){ return v.trim().length > 1; },
      'inq-mail': function(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }
    };
    function check(id){
      var el = $(id); if (!el) return true;
      var ok = rules[id](el.value), msg = $(id + '-msg'), wrap = el.closest('.field');
      if (wrap) wrap.classList.toggle('bad', !ok);
      if (msg) msg.hidden = ok;
      el.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }
    Object.keys(rules).forEach(function(id){ var el = $(id); if (el) el.addEventListener('blur', function(){ if (el.value) check(id); }); });
    var type = $('inq-type'), hours = $('inq-hours'), same = $('inq-same'), reels = $('inq-reels'), est = $('inq-est'), hrow = $('inq-hours-row');
    function estimate(){
      if (!est) return;
      var k = type ? type.value : 'event', h = hours ? Math.max(1, Math.min(12, parseInt(hours.value, 10) || 1)) : 1, lo, hi;
      if (k === 'event') { lo = 1500 + (h - 1) * 1000; hi = 1500 + (h - 1) * 1200; }
      else if (k === 'match') { lo = 1500; hi = 2500; }
      else { lo = hi = 1500; }
      if (same && same.checked) { lo = Math.round(lo * 1.2); hi = Math.round(hi * 1.3); }
      if (reels && reels.checked) { lo += 1000; hi += 2000; }
      est.textContent = (lo === hi ? nf.format(lo) : nf.format(lo) + '–' + nf.format(hi)) + ' Kč';
      if (hrow) hrow.hidden = k !== 'event';
    }
    [type, hours, same, reels].forEach(function(el){ if (el) { el.addEventListener('change', estimate); el.addEventListener('input', estimate); } });
    estimate();
    var send = $('inq-send'), done = $('inq-done');
    function submit(){
      var a = check('inq-name'), b = check('inq-mail');
      if (!(a && b)) { $(a ? 'inq-mail' : 'inq-name').focus(); return; }
      send.disabled = true; var label = send.textContent; send.textContent = 'Odesílám…';
      setTimeout(function(){ send.disabled = false; send.textContent = label; if (done) { done.hidden = false; done.setAttribute('tabindex', '-1'); done.focus(); } }, 700);
    }
    if (send) send.addEventListener('click', submit);
    form.addEventListener('keydown', function(e){ if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); submit(); } });
    var reset = $('inq-reset');
    if (reset) reset.addEventListener('click', function(){ form.reset(); if (done) done.hidden = true; form.querySelectorAll('.field.bad').forEach(function(f){ f.classList.remove('bad'); }); form.querySelectorAll('.msg').forEach(function(m){ m.hidden = true; }); estimate(); $('inq-name').focus(); });
  }

  /* ---------- Ordered dither reveal ---------- */
  var B = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  var items = [].slice.call(document.querySelectorAll('[data-dither]'));
  if (!items.length) return;
  function draw(cv, p, color, cellBase){
    var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
    var cell = w < 600 ? Math.max(12, cellBase * .6) : cellBase, cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    if (cv.width !== cols || cv.height !== rows) { cv.width = cols; cv.height = rows; }
    var c = cv.getContext('2d'); c.clearRect(0, 0, cols, rows); c.fillStyle = color;
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var dx = x / cols - .5, dy = y / rows - .5, d = Math.sqrt(dx * dx + dy * dy) * 1.1;
      if ((B[(y % 4) * 4 + (x % 4)] + .5) / 16 * .7 + d * .3 > p) c.fillRect(x, y, 1, 1);
    }
  }
  var t0 = performance.now();
  function frame(now){
    var vh = innerHeight;
    items.forEach(function(el){
      var cv = el.querySelector('canvas'); if (!cv) return;
      var p;
      if (reduce) p = 1.2;
      else if (el.dataset.dither === 'load') p = Math.min(1.2, (now - t0) / 1500 * 1.2);
      else { var r = el.getBoundingClientRect(); p = Math.max(0, Math.min(1.2, (vh - r.top) / (vh * .85) * 1.2)); }
      if (el._p !== p) { el._p = p; draw(cv, p, el.dataset.ditherColor || '#07080b', Number(el.dataset.ditherCell) || 32); }
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  addEventListener('resize', function(){ items.forEach(function(el){ el._p = -1; }); });
  /* static dithered edges: <canvas class="dedge" data-from data-to> */
  document.querySelectorAll('canvas.dedge').forEach(function(e){
    function paint(){ var w = e.clientWidth, h = e.clientHeight || 64, cell = w < 600 ? 8 : 12, cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
      e.width = cols; e.height = rows; var c = e.getContext('2d'); c.fillStyle = e.dataset.from; c.fillRect(0, 0, cols, rows); c.fillStyle = e.dataset.to;
      for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) if ((B[(y % 4) * 4 + (x % 4)] + .5) / 16 < (y + .5) / rows) c.fillRect(x, y, 1, 1); }
    paint(); addEventListener('resize', paint);
  });
})();
