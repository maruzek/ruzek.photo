// "Same day" (SameDay.astro): scroll is time. The page is rendered as the finished timeline; here it is played from
// the start. On a wide screen one scrubbed timeline draws the axis: frames pile up during the event, the picks fly out
// of the chart into the large photos, the days pass and the gallery fills in Bayer order. The stage is sticky by CSS
// (day.css), so there is no pin and no layout change; only transform, opacity and clip-path move. On narrow screens
// the axis is vertical, its line follows the scroll and every group appears once.
//
// Distances come from offsets (layout boxes ignore transforms) and are functions, measured again on every
// ScrollTrigger refresh, so a resize needs no rebuild. Texts, prices and the button never move or hide.
import type { Libs } from './choreo';
import { boxIn } from './sheet';

type Cleanup = () => void;
const noop: Cleanup = () => undefined;

/** Columns of the gallery wall (day.css, 8 on a tablet: the order only gets a little less even) */
const WALL_COLUMNS = 5;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** When the `i`-th cell of the wall appears (0–1.4): ordered dither, sweeping from left to right */
const bayerAt = (i: number): number => {
  const x = i % WALL_COLUMNS;
  const y = Math.floor(i / WALL_COLUMNS);
  return (BAYER[(y % 4) * 4 + (x % 4)] ?? 0) / 16 + x / WALL_COLUMNS / 2;
};

export function sameDay({ gsap }: Libs, root: ParentNode, wide: boolean): Cleanup {
  const day = root.querySelector<HTMLElement>('.day');
  const axis = day?.querySelector<HTMLElement>('.axis');
  const run = day?.querySelector<HTMLElement>('.run');
  if (!day || !axis || !run) return noop;
  const all = (selector: string): HTMLElement[] => [...day.querySelectorAll<HTMLElement>(selector)];
  const shots = all('.hist img');
  const wall = all('.wall img');
  const slots = all('.slot');
  // holds the sticky stage and its run (day.css) for as long as the motion exists, also after the 3 s safety net
  day.classList.add('is-live');

  if (wide) {
    /** Share of the line (page edge to page edge) at an edge of a stop's element */
    const edge = (selector: string, side: 'left' | 'right'): number => {
      const el = day.querySelector<HTMLElement>(selector);
      if (!el) return 1;
      const box = boxIn(el, axis);
      const margin = axis.getBoundingClientRect().left;
      return (margin + box.x + (side === 'right' ? box.w : 0)) / (axis.offsetWidth + 2 * margin);
    };
    const afterEvent = (): number => edge('.hist', 'right');
    const afterPicks = (): number => edge('.same .tag', 'right');
    const beforeGallery = (): number => edge('.all .tag', 'left');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: day,
        start: 'top 55%',
        end: 'bottom bottom',
        scrub: 0.35,
        invalidateOnRefresh: true,
      },
    });
    const draw = (from: () => number, to: () => number, duration: number, at: number): void => {
      tl.fromTo(run, { scaleX: from }, { scaleX: to, duration, immediateRender: at === 0 }, at);
    };

    // One tween per element: within a staggered one only the first element gets its starting state before its time.
    /** Hidden until `at`, then fades in */
    const appear = (el: Element, duration: number, at: number): void => {
      tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration }, at);
    };

    // 1 the event: frames pile up on the axis. `translate`, not `y`: GSAP would take the CSS `scale` of the crop into
    // its own transform and not give it back on revert.
    draw(() => 0, afterEvent, 4, 0);
    shots.forEach((shot, i) => {
      const at = 0.1 + (i * 3.4) / shots.length;
      tl.fromTo(
        shot,
        { autoAlpha: 0, translate: '0px -18px' },
        { autoAlpha: 1, translate: '0px 0px', duration: 0.5, ease: 'power3.out' },
        at,
      );
    });
    const marked = all('.hist .pick');
    if (marked.length > 0) tl.fromTo(marked, { '--k': 0 }, { '--k': 1, duration: 0.3 }, 4.1);

    // 2 the same day: the picks leave the pile
    draw(afterEvent, afterPicks, 1.4, 4.2);
    tl.fromTo('.day .fill', { scaleX: 0 }, { scaleX: 1, duration: 1.2 }, 4.4);
    slots.forEach((slot, i) => {
      const photo = slot.querySelector('figure');
      const cell = day.querySelector<HTMLElement>(`.hist [data-pick="${slot.dataset['pick'] ?? ''}"]`);
      if (!photo) return;
      const at = 4.2 + i * 0.28;
      const way = (): { x: number; y: number; scale: number } => {
        if (!cell) return { x: 0, y: 0, scale: 1 };
        const from = boxIn(cell, axis);
        const to = boxIn(slot, axis);
        return {
          x: from.x + from.w / 2 - to.x - to.w / 2,
          y: from.y + from.h / 2 - to.y - to.h / 2,
          scale: to.w > 0 ? from.w / to.w : 1,
        };
      };
      tl.fromTo(
        photo,
        { x: () => way().x, y: () => way().y, scale: () => way().scale },
        { x: 0, y: 0, scale: 1, duration: 1.5, ease: 'power2.inOut' },
        at,
      );
      appear(photo, 0.2, at);
    });

    // 3 the days pass
    draw(afterPicks, beforeGallery, 2, 6.4);
    tl.fromTo('.day .dust', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 2 }, 6.4);
    all('.days i').forEach((mark, i) => appear(mark, 0.3, 6.9 + i * 0.66));

    // 4 everything
    draw(beforeGallery, () => 1, 1.6, 8.4);
    wall.forEach((photo, i) => appear(photo, 0.25, 8.4 + bayerAt(i) * 0.9));
    tl.to({}, { duration: 0.8 });
  } else {
    gsap.fromTo(
      run,
      { scaleY: 0 },
      { scaleY: 1, ease: 'none', scrollTrigger: { trigger: axis, start: 'top 70%', end: 'bottom 70%', scrub: true } },
    );
    const once = (trigger: string): ScrollTrigger.Vars => ({ trigger, start: 'top 92%', once: true });
    if (shots.length > 0)
      gsap.from(shots, { autoAlpha: 0, duration: 0.3, stagger: 0.015, scrollTrigger: once('.day .hist') });
    // the clip is on the photo, not on its box: a lazy photo in a fully clipped box is not loaded until it opens
    if (slots.length > 0)
      gsap.fromTo(
        '.day .slot img',
        { clipPath: 'inset(0% 0% 100% 0%)' },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 0.7,
          ease: 'expo.out',
          stagger: 0.09,
          clearProps: 'clipPath',
          scrollTrigger: once('.day .pics'),
        },
      );
    if (wall.length > 0)
      gsap.from(wall, {
        autoAlpha: 0,
        duration: 0.3,
        stagger: (i) => bayerAt(i) * 0.5,
        scrollTrigger: once('.day .wall'),
      });
  }
  return () => day.classList.remove('is-live');
}
