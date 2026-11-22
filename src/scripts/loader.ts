// Entry loader "Práh" (design/loader-concepts/concepts/b-1.html, approved by Martin on 2026-11-22). The whole screen
// fills with the logo's cube corner extended to infinity, tile by tile in Bayer order, while the page loads. Once
// it has loaded, the density contracts from the edges to the corner until only the logo is left, and the logo flies
// into the header. Colours are the prototype's mapped onto the night background of this site.
//
// Base.astro's inline head script decides whether it runs at all (html.ldr-on): only on an entry from another site or
// with no referrer, never after an internal link, a reload or back/forward, never with reduced motion or Save-Data,
// never without JS. It stores nothing (no cookie, no storage). The motion layer waits for the `ldr:exit` event
// before the hero entrance (motion/start.ts).
import { b8 } from './effects/bayer';

/** Tiles per face edge in the logo grid, and the face maps of logo-tiles.json (a b c d) around the corner */
const CORE = 7;
const MAT = [
  [13.8564, -8, -13.8564, -8],
  [-13.8564, -8, 0, 16],
  [0, 16, 13.8564, -8],
] as const;
/** The logo's 7 greys (#181818 … #d0d0d0) inverted for the night background, darkest at the corner → brightest */
const LOGO_V = [0xe7, 0xc7, 0xa7, 0x87, 0x67, 0x47, 0x2f] as const;
/** Grey a tile fades to as it dies: the night background */
const BG_V = 0x0e;
/** Longest wait for the page, counted from navigation; the loader resolves then even if the photo is not there */
const MAX_WAIT_MS = 2500;
/** Full density takes at least this long (prototype: FILL_RATE 1 / 0.55 s) */
const FILL_S = 0.55;
const RESOLVE_MS = 920;
const SWAP_MS = 120;
const FLY_MS = 740;

interface Tile {
  /** the tile's 4 corners in CSS px */
  p: Float64Array;
  rr: number;
  b: number;
  logo: number;
  core: boolean;
  on: number;
  die: number;
  vLoad: number;
}

const ease = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
const GREY = Array.from({ length: 256 }, (_, v) => `rgb(${v},${v},${v})`);

function run(root: HTMLElement, box: HTMLElement): void {
  const canvas = box.querySelector('canvas');
  const count = box.querySelector<HTMLElement>('.n');
  const fly = document.querySelector<SVGSVGElement>('.ldr-fly');
  const ctx = canvas?.getContext('2d');
  if (!canvas || !count || !fly || !ctx) return finish(root);

  // logo cells packed as "f i j g" digit groups (Loader.astro)
  const logoKey = new Map<string, number>();
  const packed = box.dataset['t'] ?? '';
  for (let n = 0; n + 3 < packed.length; n += 4)
    logoKey.set(packed.slice(n, n + 3), Number(packed[n + 3]));

  // block scrolling under the curtain (Lenis is not running yet: the motion layer waits for ldr:exit)
  const block = (e: Event): void => e.preventDefault();
  const opts = { passive: false, capture: true } as const;
  addEventListener('wheel', block, opts);
  addEventListener('touchmove', block, opts);

  let loaded = false;
  const hero = document.querySelector<HTMLImageElement>('.hero img');
  void Promise.race([
    Promise.all([document.fonts.ready, hero?.decode().catch(() => undefined)]),
    new Promise((r) => setTimeout(r, Math.max(0, MAX_WAIT_MS - performance.now()))),
  ]).then(() => (loaded = true));

  let vw = 0;
  let vh = 0;
  let dpr = 1;
  let tiles: Tile[] = [];
  function layout(): void {
    vw = innerWidth;
    vh = innerHeight;
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas!.width = Math.round(vw * dpr);
    canvas!.height = Math.round(vh * dpr);
    // the logo occupies 191 × 220 viewBox units; its box is snapped to whole pixels so the canvas and the vector
    // logo that replaces it land on the same pixels
    const k = Math.min((vw * 0.5) / 191, (vh * 0.44) / 220);
    const cx = Math.round(vw / 2 - 98 * k) + 98 * k;
    const cy = Math.round(vh / 2 - 113 * k) + 113 * k;
    // the vector logo uses the full 320 viewBox with the corner at (160, 146)
    Object.assign(fly!.style, {
      width: `${320 * k}px`,
      height: `${320 * k}px`,
      left: `${cx - 160 * k}px`,
      top: `${cy - 146 * k}px`,
    });
    const N = Math.ceil((Math.hypot(vw, vh) / 2 / (16 * k)) * 1.25) + 2;
    const pad = 20 * k;
    let rrMax = CORE;
    tiles = [];
    MAT.forEach(([a, b, c, d], f) => {
      const mx = (u: number, v: number): number => cx + k * (a * u + c * v);
      const my = (u: number, v: number): number => cy + k * (b * u + d * v);
      for (let i = 0; i < N; i++)
        for (let j = 0; j < N; j++) {
          const ex = mx(i + 0.5, j + 0.5);
          const ey = my(i + 0.5, j + 0.5);
          if (ex < -pad || ex > vw + pad || ey < -pad || ey > vh + pad) continue;
          const u0 = i + 0.105;
          const u1 = i + 0.895;
          const v0 = j + 0.105;
          const v1 = j + 0.895;
          const rr = Math.hypot(i + 0.5, j + 0.5);
          rrMax = Math.max(rrMax, rr);
          const logo = logoKey.get(`${f}${i}${j}`) ?? -1;
          const b = b8(j + 5 * f, i + 3 * f);
          tiles.push({
            p: Float64Array.of(
              mx(u0, v0),
              my(u0, v0),
              mx(u1, v0),
              my(u1, v0),
              mx(u1, v1),
              my(u1, v1),
              mx(u0, v1),
              my(u0, v1),
            ),
            rr,
            b,
            logo,
            on: -1,
            core: i < CORE && j < CORE,
            die: 0,
            // bright at the corner, dim outward: on the night background full density is a dim field with a glowing
            // corner (the prototype's near-black screen on paper), not a white flash
            vLoad: Math.round(0x30 + 0x88 * Math.exp(-Math.max(0, rr - 4) / 7)),
          });
        }
    });
    // death order for the resolve: outside-in, Bayer-jittered; leftovers inside the 7 × 7 core go last
    const span = Math.max(1, rrMax - CORE);
    for (const t of tiles)
      t.die = t.core ? 0.7 + 0.16 * t.b : 0.04 + 0.62 * (1 - (t.rr - CORE) / span) + 0.1 * t.b;
  }

  let phase: 'fill' | 'resolve' = 'fill';
  let D = 0;
  const t0 = performance.now();
  let last = t0;
  let phaseT = 0;
  let raf = 0;

  function draw(now: number): void {
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, vw, vh);
    const waiting = phase === 'fill' && !loaded && now - t0 > 500;
    const waveAmp = waiting ? Math.min(1, (now - t0 - 500) / 700) : 0;
    const q = phase === 'resolve' ? ease(clamp01((now - phaseT) / RESOLVE_MS)) : 0;
    for (const t of tiles) {
      let alpha = 0;
      let v = t.vLoad;
      if (phase === 'fill') {
        // the corner is a little ahead of the rest, so the logo region is the first to fill
        let dl = D + (1 - D) * 0.24 * Math.exp(-t.rr / 3.2);
        // while we wait, the threshold ripples outward from the corner
        if (waveAmp) dl += 0.1 * waveAmp * Math.sin(t.rr * 0.55 - (now / 1000) * 3.2);
        if (t.b < dl) {
          if (t.on < 0) t.on = now;
          alpha = Math.min(1, (now - t.on) / 140);
        } else t.on = -1;
      } else if (t.logo >= 0) {
        const c = clamp01((q - 0.5 - t.rr * 0.012) / 0.36);
        v = Math.round(t.vLoad + ((LOGO_V[t.logo] ?? 0) - t.vLoad) * c);
        alpha = 1;
      } else {
        const life = (q - t.die) / 0.07;
        if (life >= 1) continue;
        alpha = 1 - clamp01(life);
        v = Math.round(t.vLoad + (BG_V - t.vLoad) * clamp01((q - t.die + 0.13) / 0.13));
      }
      if (alpha <= 0) continue;
      const p = t.p;
      ctx!.globalAlpha = alpha;
      ctx!.fillStyle = GREY[v] ?? '#000';
      ctx!.beginPath();
      ctx!.moveTo(p[0]!, p[1]!);
      ctx!.lineTo(p[2]!, p[3]!);
      ctx!.lineTo(p[4]!, p[5]!);
      ctx!.lineTo(p[6]!, p[7]!);
      ctx!.closePath();
      ctx!.fill();
    }
    ctx!.globalAlpha = 1;
  }

  function tick(now: number): void {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(64, now - last);
    last = now;
    if (phase === 'fill') {
      // honest-ish crawl that never reaches 1 on its own; once loaded it closes up to 64/64
      const target = loaded ? 1 : 0.8 * (1 - Math.exp(-(now - t0) / 1700));
      D = Math.min(target, D + dt / 1000 / FILL_S);
      count!.textContent = `${String(Math.min(64, Math.floor(D * 64))).padStart(2, '0')}/64`;
      if (D >= 1 && target === 1) {
        phase = 'resolve';
        phaseT = now + 40;
        box.classList.add('resolving');
      }
    } else if (now - phaseT >= RESOLVE_MS) {
      draw(phaseT + RESOLVE_MS);
      cancelAnimationFrame(raf);
      // swap the canvas for the vector logo (same pixels), then hand off to the header
      fly!.style.opacity = '1';
      canvas!.style.opacity = '0';
      swapT = window.setTimeout(exit, SWAP_MS);
      return;
    }
    draw(Math.max(now, phaseT));
  }

  function exit(): void {
    stop();
    const target = document.querySelector<SVGSVGElement>('.top .mark .roh');
    const to = target?.getBoundingClientRect();
    if (target && to && to.width > 0) {
      // FLIP the resting logo into the header slot; its greys turn into the header's colour on the way
      const from = fly!.getBoundingClientRect();
      fly!.style.setProperty('--to', getComputedStyle(target).color);
      fly!.classList.add('go');
      fly!.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`;
    } else fly!.classList.add('go', 'fade');
    box.classList.add('out');
    // the motion layer starts on ldr:exit and holds the main thread for a moment; two frames later the flight
    // already runs on the compositor and does not stall
    requestAnimationFrame(() => requestAnimationFrame(announce));
    setTimeout(() => finish(root), FLY_MS);
  }

  let swapT = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  /** Stops the animation and every listener; the flight to the header, once started, finishes on its own. */
  function stop(): void {
    cancelAnimationFrame(raf);
    clearTimeout(swapT);
    removeEventListener('wheel', block, opts);
    removeEventListener('touchmove', block, opts);
    removeEventListener('resize', layout);
    removeEventListener('keydown', abort, true);
    reduce.removeEventListener('change', abort);
  }
  // a key press (Tab must not reach links under the curtain, PageDown must not scroll under it) or a switch to
  // reduced motion ends the loader at once; the key keeps its default action
  function abort(): void {
    stop();
    finish(root);
  }

  layout();
  addEventListener('resize', layout);
  addEventListener('keydown', abort, true);
  reduce.addEventListener('change', abort);
  // the head script's safety net may end it first
  document.addEventListener('ldr:exit', stop, { once: true });
  raf = requestAnimationFrame(tick);
}

/** Ends the loader: the header logo shows again and the curtain is gone (the head script's safety net does the same). */
function finish(root: HTMLElement): void {
  root.classList.remove('ldr-on');
  announce();
}

/** `ldr:exit` fires once: the page may start its entrance (motion/start.ts) */
let announced = false;
function announce(): void {
  if (announced) return;
  announced = true;
  document.documentElement.dataset['ldr'] = 'exit';
  document.dispatchEvent(new Event('ldr:exit'));
}

const root = document.documentElement;
const box = document.querySelector<HTMLElement>('div.ldr');
if (root.classList.contains('ldr-on') && box) {
  try {
    run(root, box);
  } catch {
    finish(root);
  }
} else if (root.classList.contains('ldr-on')) finish(root);
