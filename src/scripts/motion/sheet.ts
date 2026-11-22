// The contact sheet opens (ContactSheet.astro, prototype 3). The page is rendered open; here every pick is folded
// back into its seat on the sheet with a transform, and one scrubbed ScrollTrigger over the sheet's pass through the
// viewport opens it again: first a Bayer front develops the bare sheet, then the picks leave their seats (the
// circled, empty seats stay) and grow into the spread below. No pin, no layout change: only transform, opacity
// and the canvas, so the stage keeps its height from the first paint and CLS stays 0.
//
// The fit is computed from offsets (layout boxes ignore transforms), so it is re-measured on every
// ScrollTrigger refresh without first undoing the scrubbed state. A pick's link moves with its picture: what you
// see is what you click. Keyboard focus anywhere in the gallery opens the sheet at once and for good.
import { frontEffect } from '../effects/front';
import type { Scheduler } from '../effects/scheduler';
import type { Libs } from './choreo';

type Cleanup = () => void;
const noop: Cleanup = () => undefined;
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

/**
 * The sheet's run through the viewport, as lines for the sheet's top (share of the viewport height), and where the
 * front and the picks sit in it (shares of the run; lower picks leave up to `spread` later). On a phone the sheet
 * is about half a screen tall, so its run is longer and the picks leave only once the whole sheet is in view.
 */
const RUN = {
  wide: { start: 0.92, end: 0.12, front: 0.36, open: 0.42, spread: 0.12 },
  narrow: { start: 1, end: -0.2, front: 0.3, open: 0.45, spread: 0.12 },
} as const;
/** The frame number under a pick fades in at the end, once the print is nearly its final size */
const NUMBER_AT = 0.86;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Layout box of `el` relative to `root` (offsets, so transforms on the way are ignored). */
function boxIn(el: HTMLElement, root: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

export function contactSheet(
  { gsap }: Libs,
  root: ParentNode,
  scheduler: Scheduler,
  wide: boolean,
): Cleanup {
  const run = wide ? RUN.wide : RUN.narrow;
  const cs = root.querySelector<HTMLElement>('[data-cs]');
  const sheet = cs?.querySelector<HTMLElement>('.cs-sheet');
  const picks = cs ? [...cs.querySelectorAll<HTMLElement>('.cs-pick')] : [];
  if (!cs || !sheet) return noop;
  // a late start (a deep link, a restored scroll position) misses the closed sheet: it stays open
  if (sheet.getBoundingClientRect().top < innerHeight * run.start) return noop;

  const seatOf = (pick: HTMLElement): HTMLElement | null => {
    const slot = [...pick.classList].find((c) => /^s\d$/.test(c));
    return slot ? sheet.querySelector<HTMLElement>(`[data-seat="${slot}"] .cs-box`) : null;
  };
  /** The transform that puts the pick's picture exactly over its seat */
  const fit = (pick: HTMLElement): { x: number; y: number; scale: number } => {
    const seat = seatOf(pick);
    const box = pick.querySelector<HTMLElement>('.cs-box');
    if (!seat || !box) return { x: 0, y: 0, scale: 1 };
    const from = boxIn(box, cs);
    const to = boxIn(seat, cs);
    return { x: to.x - from.x, y: to.y - from.y, scale: from.w > 0 ? to.w / from.w : 1 };
  };

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: sheet,
      start: `top ${run.start * 100}%`,
      end: `top ${run.end * 100}%`,
      scrub: true,
      invalidateOnRefresh: true,
    },
  });
  tl.to({}, { duration: 1 }, 0); // the run is 1 long: positions below are shares of it

  // lower picks leave a little later, so the spread opens from the top down
  const spread = cs.querySelector<HTMLElement>('.cs-spread');
  const depth = spread ? Math.max(1, spread.offsetHeight) : 1;
  const top = spread?.offsetTop ?? 0;
  picks.forEach((pick, i) => {
    const at = run.open + run.spread * clamp((pick.offsetTop - top) / depth, 0, 1);
    // the first picks lie on top: later ones slide underneath them on their way down
    gsap.set(pick, { zIndex: picks.length - i, transformOrigin: '0 0' });
    tl.fromTo(
      pick,
      { x: () => fit(pick).x, y: () => fit(pick).y, scale: () => fit(pick).scale },
      { x: 0, y: 0, scale: 1, ease: 'power2.inOut', duration: 1 - at },
      at,
    );
    const no = pick.querySelector('.cs-no');
    if (no) tl.fromTo(no, { opacity: 0 }, { opacity: 1, duration: 1 - NUMBER_AT }, NUMBER_AT);
  });
  cs.classList.add('cs-live');

  let open = false;
  const st = tl.scrollTrigger;
  const front = cs.querySelector<HTMLCanvasElement>('.cs-front');
  const fx = front
    ? frontEffect(front, () => (open ? 1 : (st?.progress ?? 1) / run.front))
    : null;
  const removeFx = fx ? scheduler.add(fx) : noop;

  // keyboard focus never lands on a folded or undeveloped frame: the sheet opens at once and stays open
  const onFocus = (event: FocusEvent): void => {
    const el = event.target;
    if (open || !(el instanceof HTMLElement) || !el.matches(':focus-visible')) return;
    open = true;
    st?.kill();
    tl.progress(1);
    cs.classList.remove('cs-live');
    el.scrollIntoView({ block: 'nearest' });
  };
  cs.addEventListener('focusin', onFocus);

  return () => {
    cs.removeEventListener('focusin', onFocus);
    cs.classList.remove('cs-live');
    removeFx();
    fx?.destroy();
  };
}
