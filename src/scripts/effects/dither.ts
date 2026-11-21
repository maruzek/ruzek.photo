// Fine ordered dither over photos (prototype: rozpad.js, section 2): the photo assembles from the cover colour
// as it enters, falls apart as it leaves, with a coral "developing" band at the edge. `hover` (service cards)
// re-develops the photo when the pointer enters. Progress comes from a ScrollTrigger, not from layout reads.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { b8 } from './bayer';
import type { Effect } from './scheduler';

const CORAL = [255, 122, 102] as const;
type Rgb = readonly [number, number, number];
const hex = (h: string): Rgb => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const pack = (c: Rgb): number => (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

/** Progress at which the photo is fully clear */
const CLEAR = 1.35;

export interface DitherHandle extends Effect {
  destroy(): void;
}

export function ditherEffect(el: HTMLElement): DitherHandle {
  const cv = el.querySelector<HTMLCanvasElement>('canvas.dz');
  const ctx = cv?.getContext('2d') ?? null;
  const mode =
    el.dataset['dz'] === 'hover' ? 'hover' : el.dataset['dz'] === 'stay' ? 'stay' : 'scroll';
  const cover = pack(hex(el.dataset['dzColor'] ?? '#07080b'));
  const band = pack(CORAL);
  let cols = 0;
  let thr: Float32Array | null = null;
  let img: ImageData | null = null;
  let buf: Uint32Array | null = null;
  let last = -1;
  const hover = { p: CLEAR - 0.05 };

  const layout = (): boolean => {
    if (!cv || !ctx) return false;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (!w || !h) return false;
    const cell = w < 700 ? 6 : 9;
    cols = Math.ceil(w / cell);
    const rows = Math.ceil(h / cell);
    cv.width = cols;
    cv.height = rows;
    img = ctx.createImageData(cols, rows);
    buf = new Uint32Array(img.data.buffer);
    thr = new Float32Array(cols * rows);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = x / cols - 0.5;
        const dy = y / rows - 0.5;
        thr[y * cols + x] =
          b8(x, y) * 0.7 + Math.sqrt(dx * dx + dy * dy) * 0.42 + Math.random() * 0.04;
      }
    }
    last = -1;
    return true;
  };

  const st =
    mode === 'hover'
      ? null
      : ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'bottom top' });
  const onEnter = (): void => {
    gsap.fromTo(hover, { p: 0 }, { p: CLEAR - 0.05, duration: 0.7, ease: 'power2.out' });
  };
  if (mode === 'hover') el.addEventListener('pointerenter', onEnter);
  const ro = new ResizeObserver(() => {
    thr = null;
  });
  if (cv) ro.observe(cv);

  return {
    el,
    progress() {
      if (mode === 'hover') return hover.p;
      const q = st?.progress ?? 1; // 0 entering at the bottom → 1 leaving at the top
      const enter = clamp(q / 0.42, 0, 1);
      const leave = mode === 'stay' ? 0 : clamp((q - 0.74) / 0.26, 0, 1);
      return enter * 1.4 - leave * 1.4;
    },
    tick(p) {
      if (!ctx || !cv || ((!thr || !buf || !img) && !layout()) || !thr || !buf || !img) return;
      if (Math.abs(last - p) < 0.004) return;
      last = p;
      if (p >= CLEAR) buf.fill(0);
      else
        for (let i = 0; i < buf.length; i++) {
          const t = thr[i] ?? 0;
          buf[i] = t > p + 0.045 ? cover : t > p ? band : 0;
        }
      ctx.putImageData(img, 0, 0);
      cv.dataset['painted'] = 'live';
    },
    destroy() {
      st?.kill();
      el.removeEventListener('pointerenter', onEnter);
      gsap.killTweensOf(hover);
      ro.disconnect();
      if (cv && ctx) {
        ctx.clearRect(0, 0, cv.width, cv.height);
        delete cv.dataset['painted'];
      }
    },
  };
}
