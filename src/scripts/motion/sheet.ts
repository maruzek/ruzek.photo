// The contact sheet opens (ContactSheet.astro, prototype 3). The page is rendered open; here every pick is folded
// back into its seat on the sheet with a transform, and one scrubbed ScrollTrigger over the sheet's pass through the
// viewport opens it again: first a Bayer front develops the bare sheet, then the picks leave their seats one after
// another, in reading order of the spread (the marked seats with their dimmed copies stay), and grow into the spread
// below; a vertical frame, cropped to 3:2 on the sheet, opens to the whole photo on the way. No pin, no layout
// change: only transform, clip-path, opacity and the canvas, so the stage keeps its height from the first paint and
// CLS stays 0.
//
// The fit is computed from offsets (layout boxes ignore transforms), so it is re-measured on every
// ScrollTrigger refresh without first undoing the scrubbed state. A pick's link moves with its picture: what you
// see is what you click. Keyboard focus anywhere in the gallery opens the sheet at once and for good.
import { frontEffect } from '../effects/front';
import type { Scheduler } from '../effects/scheduler';
import type { Libs } from './choreo';

type Cleanup = () => void;
const noop: Cleanup = () => undefined;

/**
 * The sheet's run through the viewport, as lines for the sheet's top (share of the viewport height), and where the
 * front and the picks sit in it (shares of the run). From `open` to the end the picks leave one after another;
 * `flight` is how many of them are on their way at the same time, so the spread never turns into a pile. On a
 * phone the sheet is most of a screen tall, so the picks leave only once the whole sheet is in view.
 */
const RUN = {
  wide: { start: 0.92, end: -0.1, front: 0.25, open: 0.3, flight: 3 },
  narrow: { start: 1, end: -0.6, front: 0.22, open: 0.45, flight: 3 },
} as const;
/** The frame number under a pick fades in over the last part of its own flight */
const NUMBER_AT = 0.8;
/**
 * Desktop only: once landed, the picks drift at lane speeds, as in the "three speeds" gallery. The left lane of
 * the spread (s3, s6, s7) rises faster than the page, the right lane (s2, s5) lags behind it, the wide picks (s1,
 * s4, s8) keep the page's pace. The offset is measured from the middle of the viewport and capped at `DRIFT_REACH`
 * of half its height, because the spread's slots span lanes: a stronger drift would push them into each other.
 */
const DRIFT: Readonly<Record<string, number>> = { s2: -0.05, s3: 0.05, s5: -0.05, s6: 0.05, s7: 0.05 };
const DRIFT_REACH = 1;
const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Vertical share (0–1) of the photo's `object-position` in a seat (work.css --cs-focus), 0.5 when unknown. */
function focusOf(seat: HTMLElement): number {
  const img = seat.querySelector('img');
  const y = img ? getComputedStyle(img).objectPosition.split(' ')[1] : undefined;
  const share = y?.endsWith('%') ? Number.parseFloat(y) / 100 : Number.NaN;
  return Number.isFinite(share) ? clamp(share, 0, 1) : 0.5;
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
  { gsap, ScrollTrigger }: Libs,
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

  const slotOf = (pick: HTMLElement): string | undefined =>
    [...pick.classList].find((c) => /^s\d$/.test(c));
  const seatOf = (pick: HTMLElement): HTMLElement | null => {
    const slot = slotOf(pick);
    return slot ? sheet.querySelector<HTMLElement>(`[data-seat="${slot}"] .cs-box`) : null;
  };
  /**
   * Where the pick's picture lies over its seat. A vertical frame shows on the sheet only a 3:2 band of the photo
   * (work.css .cs-tall), at the height its seat's `object-position` gives, so the folded pick is clipped to the same
   * band (`top`, `bottom`: the clip-path insets of its box) and that band is put over the seat. The pick's origin is
   * its top-left corner: x, y place the centre of the scaled band on the centre of the seat.
   */
  const fit = (
    pick: HTMLElement,
  ): { x: number; y: number; scale: number; top: number; bottom: number } => {
    const seat = seatOf(pick);
    const box = pick.querySelector<HTMLElement>('.cs-box');
    if (!seat || !box) return { x: 0, y: 0, scale: 1, top: 0, bottom: 0 };
    const at = boxIn(pick, cs);
    const from = boxIn(box, cs);
    const to = boxIn(seat, cs);
    const scale = from.w > 0 ? to.w / from.w : 1;
    // the band of the photo the seat shows: the seat's proportions at the photo's width
    const band = Math.min(from.h, to.w > 0 ? (from.w * to.h) / to.w : from.h);
    const top = (from.h - band) * focusOf(seat);
    return {
      x: to.x + to.w / 2 - at.x - (from.x - at.x + from.w / 2) * scale,
      y: to.y + to.h / 2 - at.y - (from.y - at.y + top + band / 2) * scale,
      scale,
      top,
      bottom: from.h - band - top,
    };
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

  // the picks leave in slot order (= reading order of the spread, so it opens from the top down), each on its own
  // stretch of the run; about `flight` of them are on their way at once
  const step = (1 - run.open) / Math.max(1, picks.length - 1 + run.flight);
  const duration = Math.min(1 - run.open, step * run.flight);
  picks.forEach((pick, i) => {
    const at = run.open + i * step;
    // the first picks lie on top: later ones slide underneath them on their way down
    gsap.set(pick, { zIndex: picks.length - i, transformOrigin: '0 0' });
    tl.fromTo(
      pick,
      { x: () => fit(pick).x, y: () => fit(pick).y, scale: () => fit(pick).scale },
      { x: 0, y: 0, scale: 1, ease: 'power2.inOut', duration },
      at,
    );
    // a vertical frame leaves showing its crop from the sheet and opens to the whole photo as it flies
    const box = pick.querySelector('.cs-box');
    if (box && seatOf(pick)?.closest('.cs-tall'))
      tl.fromTo(
        box,
        { clipPath: () => `inset(${fit(pick).top}px 0px ${fit(pick).bottom}px 0px)` },
        { clipPath: 'inset(0px 0px 0px 0px)', ease: 'power2.inOut', duration },
        at,
      );
    const no = pick.querySelector('.cs-no');
    if (no)
      tl.fromTo(
        no,
        { opacity: 0 },
        { opacity: 1, duration: duration * (1 - NUMBER_AT) },
        at + duration * NUMBER_AT,
      );
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

  const stopDrift = wide ? drift() : noop;

  /**
   * The lane drift of the landed picks (DRIFT). It moves each pick's `.cs-float` (picture and number), never the
   * link itself, which the fold moves; it grows in as the pick lands, so a folded pick stays exactly on its seat.
   * Positions come from offsets, measured at every refresh, because the folded picks are transformed.
   */
  function drift(): Cleanup {
    if (!cs) return noop;
    const lanes = picks.flatMap((pick, i) => {
      const el = pick.querySelector<HTMLElement>('.cs-float');
      const speed = DRIFT[slotOf(pick) ?? ''] ?? 0;
      if (!el || speed === 0) return [];
      return [{ pick, el, speed, at: run.open + i * step, mid: 0, set: gsap.quickSetter(el, 'y', 'px') }];
    });
    if (lanes.length === 0) return noop;
    const measure = (): void => {
      if (!cs) return;
      const top = cs.getBoundingClientRect().top + scrollY;
      for (const lane of lanes) {
        const box = boxIn(lane.pick, cs);
        lane.mid = top + box.y + box.h / 2;
      }
    };
    const update = (): void => {
      const half = innerHeight / 2;
      const progress = tl.progress();
      for (const lane of lanes) {
        const landed = clamp((progress - lane.at) / duration, 0, 1);
        const reach = Math.abs(lane.speed) * half * DRIFT_REACH;
        lane.set(landed * clamp(lane.speed * (lane.mid - scrollY - half), -reach, reach));
      }
    };
    const trigger = ScrollTrigger.create({
      trigger: cs,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: update,
      onRefresh: () => {
        measure();
        update();
      },
    });
    measure();
    update();
    return () => {
      trigger.kill();
      for (const lane of lanes) gsap.set(lane.el, { clearProps: 'transform' });
    };
  }

  return () => {
    stopDrift();
    cs.removeEventListener('focusin', onFocus);
    cs.classList.remove('cs-live');
    removeFx();
    fx?.destroy();
  };
}
