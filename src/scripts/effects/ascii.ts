// ASCII hero (prototype: rozpad.js, section 1). The photo resolves out of characters on the first visit, a lens
// of characters follows the pointer, and the photo turns back into characters as the hero scrolls away.
// Runs without GSAP (it ships with the first paint), drives one frame callback through the shared scheduler,
// and does nothing at all with reduced motion. The canvas is decorative (aria-hidden); the photo below it stays
// visible and loads first.
import { b8 } from './bayer';
import { createGlyphAtlas, RAMP, type GlyphAtlas } from './glyph-atlas';
import { createQualityProbe, initialQuality, type Quality } from './quality';
import { createScheduler, rafTicker, viewportObserver } from './scheduler';

/** Cell width in CSS px, desktop and mobile (prototype: 8 px on mobile) */
const CELL = 10;
/** Upper limit of cells; beyond it the cell grows */
const MAX_CELLS = 6000;
const CELL_RATIO = 1.55;
const MAX_DPR = 1.5;
const INTRO_DELAY_MS = 250;
const INTRO_MS = 2400;
/** Intro length on a weak device (quality `lite`): a short dissolve */
const LITE_INTRO_MS = 450;
/** On touch the lens wanders this long and then stops (WCAG 2.2.2, concept.md §14) */
const DRIFT_MS = 5000;
const LENS_RADIUS = { small: 110, large: 190 } as const;
const COVER = 'rgba(7,8,11,.9)';

const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2); // power2.inOut

/** The short dissolve after a switch to `lite`: starts exactly at the rendered amount `from` (HM-11). */
export function fadeLoad(from: number, elapsedMs: number, durationMs: number): number {
  return from * (1 - clamp(elapsedMs / durationMs, 0, 1));
}

type Lens = 'off' | 'tracking' | 'drift' | 'idle';

export function initAsciiHero(
  root: HTMLElement,
  opts: { reduce: boolean; fine: boolean },
): () => void {
  const img = root.querySelector<HTMLImageElement>('.media img');
  const cv = root.querySelector<HTMLCanvasElement>('canvas.ascii');
  const ctx = cv?.getContext('2d');
  const sampler = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (opts.reduce || !img || !cv || !ctx || !sampler) return () => undefined;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  let quality: Quality = initialQuality(nav);
  const probe = createQualityProbe();
  const fontFamily = getComputedStyle(root).getPropertyValue('--f-mono').trim() || 'monospace';

  let W = 0;
  let H = 0;
  let cols = 0;
  let rows = 0;
  let cw = CELL;
  let ch = CELL * CELL_RATIO;
  let lum: Float32Array | null = null;
  let thr = new Float32Array(0);
  let chars = new Uint8Array(0);
  let atlas: GlyphAtlas | null = null;

  // intro: 1 = all characters, 0 = the photo
  let load = 1;
  let introStart = -1;
  const introMs = quality === 'lite' ? LITE_INTRO_MS : INTRO_MS;
  let fade: { from: number; start: number } | null = null;
  let leave = 0;
  let lens: Lens = 'off';
  let lensOn = 0;
  let lensTarget = 0;
  let lx = -9999;
  let ly = -9999;
  let tx = -9999;
  let ty = -9999;
  let driftStart = -1;
  let lastA = -1;
  let lastLens = { x: lx, y: ly, on: 0 };
  let prevBox: [number, number, number, number] | null = null;
  let dirty = true;
  let lastTime = -1;

  const setIntro = (state: 'running' | 'done' | 'skipped' | 'lite'): void => {
    root.dataset['asciiIntro'] = state;
  };
  const setLens = (state: Lens): void => {
    lens = state;
    root.dataset['asciiLens'] = state;
  };

  function sample(): void {
    if (!img || !sampler || !img.naturalWidth || cols === 0) return;
    sampler.canvas.width = cols;
    sampler.canvas.height = rows;
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const sw = W / s;
    const sh = H / s;
    // CSS positions the covered image with two percentages, depending on the viewport width.
    const [x = '50%', y = '50%'] = getComputedStyle(img).objectPosition.split(' ');
    sampler.drawImage(
      img,
      ((img.naturalWidth - sw) * parseFloat(x)) / 100,
      ((img.naturalHeight - sh) * parseFloat(y)) / 100,
      sw,
      sh,
      0,
      0,
      cols,
      rows,
    );
    try {
      const d = sampler.getImageData(0, 0, cols, rows).data;
      lum = new Float32Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) {
        const l =
          ((d[i * 4] ?? 0) * 0.299 + (d[i * 4 + 1] ?? 0) * 0.587 + (d[i * 4 + 2] ?? 0) * 0.114) /
          255;
        const v = l ** 0.85;
        lum[i] = v;
        chars[i] = Math.min(RAMP.length - 1, Math.floor(v * RAMP.length));
      }
    } catch {
      lum = null; // a tainted canvas: keep the plain photo
    }
    dirty = true;
  }

  function layout(): void {
    if (!cv || !ctx) return;
    const r = root.getBoundingClientRect();
    W = r.width;
    H = r.height;
    const dpr = Math.min(devicePixelRatio || 1, MAX_DPR);
    cw = Math.max(CELL, Math.ceil(Math.sqrt((W * H) / (CELL_RATIO * MAX_CELLS))));
    while (Math.ceil(W / cw) * Math.ceil(H / Math.round(cw * CELL_RATIO)) > MAX_CELLS) cw++; // HM-15
    ch = Math.round(cw * CELL_RATIO);
    cols = Math.ceil(W / cw);
    rows = Math.ceil(H / ch);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    atlas = createGlyphAtlas(cw, ch, dpr, fontFamily);
    thr = new Float32Array(cols * rows);
    chars = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) thr[y * cols + x] = b8(x, y) * 0.78 + Math.random() * 0.22;
    sample();
    prevBox = null;
  }

  const radius = (): number => (W < 700 ? LENS_RADIUS.small : LENS_RADIUS.large);

  function amountAt(x: number, y: number, A: number): number {
    if (lensOn <= 0.001) return A;
    const dx = x * cw + cw / 2 - lx;
    const dy = y * ch + ch / 2 - ly;
    const d = Math.sqrt(dx * dx + dy * dy) / radius();
    const l = d >= 1 ? 0 : (1 - d * d) * (1 - d * d) * 1.15;
    return Math.max(A, l * lensOn);
  }

  function paint(x0: number, y0: number, x1: number, y1: number, A: number): void {
    if (!ctx || !lum || !atlas) return;
    ctx.clearRect(x0 * cw, y0 * ch, (x1 - x0) * cw, (y1 - y0) * ch);
    ctx.fillStyle = COVER;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * cols + x;
        const a = amountAt(x, y, A);
        const t = thr[i] ?? 1;
        if (t >= a) continue;
        ctx.fillRect(x * cw, y * ch, cw, ch);
        // random flicker only for fine pointers (a moving lens draws attention there anyway)
        let c = chars[i] ?? 0;
        if (opts.fine && Math.random() < 0.015) c = Math.floor(Math.random() * RAMP.length);
        if (c === 0) continue;
        const band = a < 1 && t > a - 0.09;
        const level = band ? 3 : Math.min(2, Math.floor((lum[i] ?? 0) * 3));
        atlas.draw(ctx, c, level, x * cw, y * ch);
      }
    }
  }

  function tick(_p: number, time: number): void {
    if (!lum) return;
    const dt = lastTime < 0 ? 16 : time - lastTime;
    lastTime = time;

    if (introStart >= 0 && load > 0) {
      const t = (time - introStart) / introMs;
      if (t >= 0) {
        probe.sample(dt);
        if (quality === 'full' && probe.verdict() === 'lite') {
          // weak device: finish with a short dissolve from where the intro is now, and no lens
          quality = 'lite';
          fade = { from: load, start: time };
          setIntro('lite');
          lensTarget = 0;
          setLens('off');
        }
        load = fade
          ? fadeLoad(fade.from, time - fade.start, LITE_INTRO_MS)
          : 1 - easeInOut(clamp((time - introStart) / introMs, 0, 1));
        if (load <= 0) {
          load = 0;
          if (root.dataset['asciiIntro'] === 'running') setIntro('done');
        }
      }
    }

    if (lens === 'drift') {
      if (driftStart < 0) driftStart = time;
      lx = W * (0.5 + 0.32 * Math.sin(time / 3100));
      ly = H * (0.38 + 0.18 * Math.sin(time / 2300));
      if (time - driftStart > DRIFT_MS) {
        lensTarget = 0;
        setLens('idle');
      }
    } else if (lens === 'tracking') {
      lx += (tx - lx) * 0.25;
      ly += (ty - ly) * 0.25;
    }
    lensOn += (lensTarget - lensOn) * 0.15;
    if (Math.abs(lensTarget - lensOn) < 0.005) lensOn = lensTarget;

    const A = Math.max(load, leave * 1.15);
    const lensMoved =
      Math.abs(lx - lastLens.x) > 0.5 || Math.abs(ly - lastLens.y) > 0.5 || lensOn !== lastLens.on;
    if (A !== lastA || dirty) {
      paint(0, 0, cols, rows, A);
      lastA = A;
      dirty = false;
      prevBox = null;
    } else if (lensMoved && (lensOn > 0 || lastLens.on > 0)) {
      // repaint only the cells around the lens (where it is now and where it was)
      const R = radius() + cw * 2;
      const box: [number, number, number, number] = [
        clamp(Math.floor((lx - R) / cw), 0, cols),
        clamp(Math.floor((ly - R) / ch), 0, rows),
        clamp(Math.ceil((lx + R) / cw), 0, cols),
        clamp(Math.ceil((ly + R) / ch), 0, rows),
      ];
      const u = prevBox
        ? ([
            Math.min(box[0], prevBox[0]),
            Math.min(box[1], prevBox[1]),
            Math.max(box[2], prevBox[2]),
            Math.max(box[3], prevBox[3]),
          ] as const)
        : box;
      paint(u[0], u[1], u[2], u[3], A);
      prevBox = box;
    }
    lastLens = { x: lx, y: ly, on: lensOn };
  }

  // the photo turns back into characters as the hero leaves (scroll position, no layout read per frame)
  const onScroll = (): void => {
    leave = H > 0 ? clamp(scrollY / H, 0, 1) : 0;
  };
  const onMove = (e: PointerEvent): void => {
    if (quality !== 'full') return; // no lens in `lite` (HM-11)
    const r = root.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    if (lens !== 'tracking') {
      lx = tx;
      ly = ty;
    }
    setLens('tracking');
    lensTarget = 1;
  };
  const onLeave = (): void => {
    lensTarget = 0;
    setLens('off');
  };

  const begin = (skipIntro: boolean): void => {
    layout();
    onScroll();
    if (skipIntro) {
      load = 0;
      setIntro('skipped');
    } else {
      introStart = performance.now() + INTRO_DELAY_MS;
      setIntro(quality === 'lite' ? 'lite' : 'running');
    }
    if (quality === 'full') {
      if (opts.fine) setLens('off');
      else {
        lensTarget = 0.9;
        setLens('drift');
      }
    } else setLens('off');
  };

  // No dissolve over a photo people may already see (risk R4, HM-03): a photo that is loaded when this module
  // runs, or a page the 3 s fallback has already revealed (a late module, a late photo), skips the intro.
  const revealed = (): boolean => document.documentElement.classList.contains('reveal-fallback');
  const onLoad = (): void => begin(revealed());
  if (img.complete && img.naturalWidth > 0) begin(true);
  else img.addEventListener('load', onLoad, { once: true });

  if (opts.fine) {
    root.addEventListener('pointermove', onMove, { passive: true });
    root.addEventListener('pointerleave', onLeave);
  }
  addEventListener('scroll', onScroll, { passive: true });
  let resizeTimer = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (W !== root.clientWidth || H !== root.clientHeight) layout();
    }, 150);
  });
  ro.observe(root);

  const scheduler = createScheduler({ ticker: rafTicker, observe: viewportObserver('0px') });
  const remove = scheduler.add({ el: root, tick, progress: () => 0 });

  return () => {
    remove();
    ro.disconnect();
    clearTimeout(resizeTimer);
    img.removeEventListener('load', onLoad);
    removeEventListener('scroll', onScroll);
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', onLeave);
    ctx.clearRect(0, 0, cv.width, cv.height);
  };
}
