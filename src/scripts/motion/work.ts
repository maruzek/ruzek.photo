// Selected work, "three speeds" (WorkGrid.astro). Scroll-scrubbed transforms only, no pin, no layout change:
// the CSS layout is final before this runs, so nothing shifts (CLS 0) and a revert leaves the static page.
//   three lanes (≥ 1100 px): the outer lanes rise faster than the page, the right one fastest; the middle lane
//     lags behind, against them. One timeline on one ScrollTrigger drives all three.
//   two columns (641–1099 px): the left column rises, the right one lags; the column of a photo is measured at
//     refresh, because the columns are balanced by the browser.
//   one column (≤ 640 px): no lanes to set against each other; each photo drifts gently inside its frame,
//     alternating up and down.
// Speeds are fractions of the scroll: 0.1 means the lane covers 10 % more distance than the page. The lanes line
// up (their CSS place) when the bottom of the gallery is at ALIGN of the viewport, so the gallery ends as one even
// edge above the "Want photos like these" rule; the difference in speed opens up at the top instead, where it
// reads as a staggered entrance under the heading (whose right side is empty anyway).
import type { Libs } from './choreo';

type Cleanup = () => void;
const noop: Cleanup = () => undefined;

/** Relative speed of each lane: positive rises faster than the page, negative lags behind it. */
export const LANE_SPEED = { left: 0.06, middle: -0.06, right: 0.14 } as const;
/** Two columns: the left one rises, the right one lags */
const COLUMN_SPEED = [0.06, -0.04] as const;
/** Viewport fraction (from the top) where the bottom of the gallery is when the lanes line up */
const ALIGN = 0.75;
/** One column: drift of the media inside its frame (% of its height) and the overscan that hides its edges */
const DRIFT_PERCENT = 3;
const DRIFT_SCALE = 1.08;

/** The whole gallery passes the viewport: from its top at the bottom edge to its bottom at the top edge. */
const pass = (trigger: Element): ScrollTrigger.Vars => ({
  trigger,
  start: 'top bottom',
  end: 'bottom top',
  scrub: true,
  invalidateOnRefresh: true,
});

/**
 * Offsets of a lane at the start and the end of the pass, for a relative speed. Linear in the scroll, zero where
 * the bottom of the gallery is at ALIGN of the viewport (measured at every refresh).
 */
function travel(work: HTMLElement, speed: number): { from: () => number; to: () => number } {
  return {
    from: () => speed * (work.offsetHeight + (1 - ALIGN) * innerHeight),
    to: () => -speed * ALIGN * innerHeight,
  };
}

export function workLanes({ gsap }: Libs, root: ParentNode): Cleanup {
  const work = root.querySelector<HTMLElement>('[data-work]');
  if (!work) return noop;
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: pass(work) });
  for (const lane of work.querySelectorAll<HTMLElement>('[data-lane]')) {
    const { from, to } = travel(work, LANE_SPEED[lane.dataset['lane'] as keyof typeof LANE_SPEED] ?? 0);
    tl.fromTo(lane, { y: from }, { y: to }, 0);
  }
  return noop;
}

export function workColumns({ gsap }: Libs, root: ParentNode): Cleanup {
  const work = root.querySelector<HTMLElement>('[data-work]');
  const shots = work ? [...work.querySelectorAll<HTMLElement>('.shot')] : [];
  if (!work || shots.length === 0) return noop;
  // read at refresh too (invalidateOnRefresh): the browser may balance the columns differently after a resize.
  // The offsets are vertical only, so the horizontal position is the column even while a photo is moved.
  const speed = (shot: HTMLElement): number => {
    const box = work.getBoundingClientRect();
    const left = shot.getBoundingClientRect().left - box.left;
    return COLUMN_SPEED[left < box.width / 2 ? 0 : 1];
  };
  const offset =
    (end: 'from' | 'to') =>
    (_i: number, el: HTMLElement): number =>
      travel(work, speed(el))[end]();
  gsap.fromTo(
    shots,
    { y: offset('from') },
    { y: offset('to'), ease: 'none', scrollTrigger: pass(work) },
  );
  return noop;
}

export function workDrift({ gsap }: Libs, root: ParentNode): Cleanup {
  root.querySelectorAll<HTMLElement>('[data-work] .shot').forEach((shot, i) => {
    const media = shot.querySelector('.media');
    if (!media) return;
    const dir = i % 2 === 0 ? 1 : -1;
    gsap.fromTo(
      media,
      { yPercent: -dir * DRIFT_PERCENT, scale: DRIFT_SCALE },
      {
        yPercent: dir * DRIFT_PERCENT,
        scale: DRIFT_SCALE,
        ease: 'none',
        scrollTrigger: { ...pass(shot), invalidateOnRefresh: false },
      },
    );
  });
  return noop;
}
