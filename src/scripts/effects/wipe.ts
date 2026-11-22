// Dithered wipes between the night and light zones (prototype: rozpad.js, section 3). No GSAP here: with
// reduced motion or Save-Data boot.ts paints them once, statically, without loading the motion layer.
import { b8 } from './bayer';
import type { Effect } from './scheduler';

const CORAL = [255, 122, 102] as const;
/** The fixed edge position of a static wipe (concept.md §7: q = 0.55) */
export const STATIC_WIPE = 0.55;

type Rgb = readonly [number, number, number];
const hex = (h: string): Rgb => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const pack = (c: Rgb): number => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

interface WipeState {
  ctx: CanvasRenderingContext2D;
  cols: number;
  rows: number;
  img: ImageData;
  buf: Uint32Array;
  from: number;
  to: number;
  band: number;
  last: number;
  width: number;
  height: number;
}

const states = new WeakMap<HTMLCanvasElement, WipeState>();

function layout(cv: HTMLCanvasElement): WipeState | null {
  const w = cv.clientWidth;
  const h = cv.clientHeight;
  const known = states.get(cv);
  // both sides: a window resized only in height changes the canvas height (wipe.css uses vh)
  if (known && known.width === w && known.height === h) return known;
  const ctx = cv.getContext('2d');
  if (!ctx || !w || !h) return null;
  const cell = w < 700 ? 6 : 8;
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  cv.width = cols;
  cv.height = rows;
  const img = ctx.createImageData(cols, rows);
  const state: WipeState = {
    ctx,
    cols,
    rows,
    img,
    buf: new Uint32Array(img.data.buffer),
    from: pack(hex(cv.dataset['from'] ?? '#07080b')),
    to: pack(hex(cv.dataset['to'] ?? '#f2f2f3')),
    band: pack(CORAL),
    last: -1,
    width: w,
    height: h,
  };
  states.set(cv, state);
  return state;
}

/** Paints the wipe with its edge at `q` (0 = all `from`, 1 = all `to`); `band` draws the coral edge. */
export function paintWipe(cv: HTMLCanvasElement, q: number, band = true): void {
  const s = layout(cv);
  if (!s || Math.abs(q - s.last) < 0.004) return;
  s.last = q;
  const edge = q * 1.1 - 0.05;
  for (let y = 0; y < s.rows; y++) {
    // the `to` colour grows up from the bottom edge, where the canvas meets the `to` zone, so neither edge of the
    // band is a hard line between the two colours
    const g = 1 - y / Math.max(1, s.rows - 1);
    for (let x = 0; x < s.cols; x++) {
      const t = b8(x, y) * 0.55 + g * 0.45;
      s.buf[y * s.cols + x] = t < edge - 0.03 ? s.to : t < edge ? (band ? s.band : s.to) : s.from;
    }
  }
  s.ctx.putImageData(s.img, 0, 0);
}

/** Every wipe of the page as a still pattern (reduced motion, Save-Data, after the motion layer stops). */
export function paintStaticWipes(root: ParentNode = document): void {
  for (const cv of root.querySelectorAll<HTMLCanvasElement>('canvas.dwipe')) {
    const s = states.get(cv);
    if (s) s.last = -1;
    paintWipe(cv, STATIC_WIPE, false);
    cv.dataset['painted'] = 'static';
  }
}

/** A wipe driven by `progress` (a ScrollTrigger in start.ts). */
export function wipeEffect(
  cv: HTMLCanvasElement,
  progress: () => number = () => STATIC_WIPE,
): Effect {
  return {
    el: cv,
    progress: () => clamp(progress(), 0, 1),
    tick(p) {
      paintWipe(cv, p);
      cv.dataset['painted'] = 'live';
    },
  };
}
