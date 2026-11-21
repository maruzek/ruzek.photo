// The motion layer, loaded by boot.ts only when motion is allowed. GSAP, its plugins and Lenis arrive with this
// chunk, never with reduced motion or Save-Data.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { ditherEffect } from '../effects/dither';
import { createScheduler, viewportObserver } from '../effects/scheduler';
import { paintStaticWipes, wipeEffect } from '../effects/wipe';
import { initCursor } from '../cursor';
import { initLightbox } from '../lightbox';
import {
  entrances,
  folds,
  headerBlend,
  headerHide,
  heroLeave,
  marquee,
  parallax,
  sameDay,
  type Libs,
} from './choreo';
import { startLenis } from './lenis';

/** Longest wait for the web fonts before SplitText measures lines (ms); autoSplit re-splits after a late font */
const FONT_WAIT_MS = 1200;

const MOTION = '(prefers-reduced-motion: no-preference)';
const DESKTOP = '(min-width: 901px)';
const FINE = '(hover: hover) and (pointer: fine)';

/** Dither reveals and wipes on one scheduler driven by the GSAP ticker (concept.md §7). */
function canvasEffects(scope: ParentNode): () => void {
  const scheduler = createScheduler({
    ticker: (cb) => {
      const fn = (t: number): void => cb(t * 1000);
      gsap.ticker.add(fn);
      return () => gsap.ticker.remove(fn);
    },
    observe: viewportObserver('10% 0px'),
  });
  const removers: Array<() => void> = [];
  for (const el of scope.querySelectorAll<HTMLElement>('[data-dz]')) {
    const fx = ditherEffect(el);
    const remove = scheduler.add(fx);
    removers.push(() => {
      remove();
      fx.destroy();
    });
  }
  for (const cv of scope.querySelectorAll<HTMLCanvasElement>('canvas.dwipe')) {
    // prototype: edge position = (vh - top) / (0.75 vh), i.e. from entering the viewport until its top hits 25 %
    const st = ScrollTrigger.create({ trigger: cv, start: 'top bottom', end: 'top 25%' });
    const remove = scheduler.add(wipeEffect(cv, () => st.progress));
    removers.push(() => {
      remove();
      st.kill();
    });
  }
  return () => {
    removers.forEach((fn) => fn());
    paintStaticWipes(scope);
  };
}

export async function start(): Promise<() => void> {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const root = document.documentElement;
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, FONT_WAIT_MS))]);

  const libs: Libs = { gsap, ScrollTrigger, SplitText };
  // read in the same task that sets the first GSAP state: content the fallback already showed stays put
  const withEntrances = !root.classList.contains('reveal-fallback');
  const smooth = startLenis(gsap, ScrollTrigger);
  const dialog = document.querySelector<HTMLDialogElement>('dialog.lb');
  if (dialog) initLightbox(dialog, { onOpen: smooth.stop, onClose: smooth.start });

  const mm = gsap.matchMedia();
  mm.add(MOTION, () => {
    const cleanups = [
      heroLeave(libs, document),
      withEntrances ? entrances(libs, document) : () => undefined,
      folds(libs, document),
      parallax(libs, document),
      marquee(libs, document),
      headerHide(libs, document),
      headerBlend(document),
      canvasEffects(document),
    ];
    return () => cleanups.forEach((fn) => fn());
  });
  mm.add({ motion: MOTION, desktop: DESKTOP }, (ctx) => {
    if (!ctx.conditions?.['motion']) return;
    return sameDay(libs, document, ctx.conditions['desktop'] === true);
  });
  mm.add({ motion: MOTION, fine: FINE }, (ctx) => {
    if (!ctx.conditions?.['motion'] || !ctx.conditions['fine']) return;
    return initCursor(gsap);
  });
  // same frame as the first GSAP states above: the CSS stops hiding and GSAP holds the start positions
  root.classList.add('motion-ready');

  const refresh = (): void => ScrollTrigger.refresh();
  void document.fonts.ready.then(refresh);
  if (document.readyState === 'complete') refresh();
  else addEventListener('load', refresh, { once: true });

  return () => {
    removeEventListener('load', refresh);
    mm.revert();
    smooth.destroy();
    if (dialog) initLightbox(dialog, {});
    root.classList.remove('motion-ready');
  };
}
