// The Bayer front of the contact sheet (ContactSheet.astro): an ordered-dither edge with the coral band runs across
// the sheet from left to right and develops the frames out of the bare paper. Ahead of the front the canvas is the
// sheet's own background colour, behind it the canvas is clear. Progress comes from the sheet's ScrollTrigger.
import { b8 } from './bayer';
import type { Effect } from './scheduler';

const CORAL = [255, 122, 102] as const;
type Rgb = readonly [number, number, number];
const pack = (c: Rgb): number => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
/** `rgb(232, 232, 234)` → [232, 232, 234]; a transparent or unknown colour falls back to the light zone */
const rgbOf = (css: string): Rgb => {
  const [r = 242, g = 242, b = 243] = (css.match(/\d+/g) ?? []).map(Number);
  return [r, g, b];
};

export interface FrontHandle extends Effect {
  destroy(): void;
}

/** `progress`: 0 = the sheet is bare paper, 1 = fully developed (the canvas is clear). */
export function frontEffect(cv: HTMLCanvasElement, progress: () => number): FrontHandle {
  const ctx = cv.getContext('2d');
  let cols = 0;
  let thr: Float32Array | null = null;
  let img: ImageData | null = null;
  let buf: Uint32Array | null = null;
  let cover = 0;
  let last = -1;

  const layout = (): boolean => {
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!ctx || !w || !h) return false;
    const cell = w < 700 ? 5 : 7;
    cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    cv.width = cols;
    cv.height = rows;
    img = ctx.createImageData(cols, rows);
    buf = new Uint32Array(img.data.buffer);
    thr = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++)
        // mostly left → right, a little top → bottom, broken up by the Bayer matrix
        thr[y * cols + x] = b8(x, y) * 0.4 + (x / cols) * 0.75 + (y / rows) * 0.12;
    cover = pack(rgbOf(getComputedStyle(cv.parentElement ?? cv).backgroundColor));
    last = -1;
    return true;
  };
  const ro = new ResizeObserver(() => {
    thr = null;
  });
  ro.observe(cv);

  return {
    el: cv,
    progress: () => clamp(progress(), 0, 1),
    tick(p) {
      if ((!thr || !buf || !img) && !layout()) return;
      if (!ctx || !thr || !buf || !img || Math.abs(last - p) < 0.003) return;
      last = p;
      if (p >= 1) buf.fill(0);
      else {
        const edge = p * 1.4 - 0.08;
        const band = pack(CORAL);
        for (let i = 0; i < buf.length; i++) {
          const t = thr[i] ?? 0;
          buf[i] = t >= edge + 0.06 ? cover : t >= edge ? band : 0;
        }
      }
      ctx.putImageData(img, 0, 0);
      cv.dataset['painted'] = p >= 1 ? 'clear' : 'live';
    },
    destroy() {
      ro.disconnect();
      if (ctx) ctx.clearRect(0, 0, cv.width, cv.height);
      delete cv.dataset['painted'];
    },
  };
}
