// GSAP choreography (prototype: rozpad.js, block "GSAP choreography"). Every function takes its root and
// returns a cleanup for what GSAP's matchMedia context does not revert by itself (listeners, classes).
// Entrance animations run only when `entrances` is true: when the 3 s CSS fallback has already revealed the
// page, hiding it again would flash (Review Focus 2).
import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger';
import type { SplitText as Split } from 'gsap/SplitText';

export interface Libs {
  gsap: typeof Gsap;
  ScrollTrigger: typeof ST;
  SplitText: typeof Split;
}
type Cleanup = () => void;
const noop: Cleanup = () => undefined;
const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));

/** The hero copy drifts up and fades as the hero leaves. */
export function heroLeave({ gsap }: Libs, root: ParentNode): Cleanup {
  const hero = root.querySelector<HTMLElement>('.hero');
  const base = hero?.querySelector('.base');
  if (!hero || !base) return noop;
  gsap.to(base, {
    yPercent: -18,
    opacity: 0.2,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });
  return noop;
}

/** Name and headings rise in masks (SplitText), groups and paragraphs rise into place. */
export function entrances({ gsap, SplitText }: Libs, root: ParentNode): Cleanup {
  const name = root.querySelector<HTMLElement>('#name');
  if (name) {
    SplitText.create(name, {
      type: 'chars',
      mask: 'chars',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.chars, {
          yPercent: 115,
          duration: 1.25,
          ease: 'expo.out',
          stagger: 0.045,
          delay: 0.55,
        }),
    });
  }
  const heroBits = root.querySelectorAll('.hero .kick > *, .hero .row > *');
  if (heroBits.length > 0) {
    gsap.from(heroBits, {
      y: 24,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.08,
      delay: 1.1,
    });
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-split]')) {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.09,
          scrollTrigger: { trigger: el, start: 'top 86%', once: true },
        }),
    });
  }
  for (const group of root.querySelectorAll<HTMLElement>('[data-stagger]')) {
    gsap.from(group.children, {
      y: 48,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      stagger: 0.1,
      scrollTrigger: { trigger: group, start: 'top 85%', once: true },
    });
  }
  for (const el of root.querySelectorAll<HTMLElement>('[data-rise]')) {
    gsap.from(el, {
      y: 32,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  }
  const big = root.querySelector<HTMLElement>('.foot .big');
  if (big) {
    SplitText.create(big, {
      type: 'chars',
      mask: 'chars',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.chars, {
          yPercent: 110,
          duration: 1.1,
          ease: 'expo.out',
          stagger: 0.03,
          scrollTrigger: { trigger: big, start: 'top 92%', once: true },
        }),
    });
  }
  return noop;
}

/** Photo folds: slow zoom out and the caption drifting in. */
export function folds({ gsap }: Libs, root: ParentNode): Cleanup {
  for (const fold of root.querySelectorAll<HTMLElement>('.fold')) {
    const media = fold.querySelector('.dph');
    if (media) {
      gsap.fromTo(
        media,
        { scale: 1.16 },
        {
          scale: 1,
          ease: 'none',
          scrollTrigger: { trigger: fold, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      );
    }
    const note = fold.querySelector('.note');
    if (note) {
      gsap.from(note, {
        y: 80,
        ease: 'none',
        scrollTrigger: { trigger: fold, start: 'top bottom', end: 'center center', scrub: true },
      });
    }
    const idx = fold.querySelector('.idx b');
    if (idx) {
      gsap.from(idx, {
        yPercent: 60,
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: fold, start: 'top 70%', end: 'center center', scrub: true },
      });
    }
  }
  return noop;
}

/** Work grid parallax (`data-par` = offset in px). */
export function parallax({ gsap }: Libs, root: ParentNode): Cleanup {
  for (const el of root.querySelectorAll<HTMLElement>('[data-par]')) {
    const par = Number(el.dataset['par']);
    if (!Number.isFinite(par)) continue;
    gsap.fromTo(
      el,
      { y: par },
      {
        y: -par,
        ease: 'none',
        scrollTrigger: {
          trigger: el.parentElement,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      },
    );
  }
  return noop;
}

/** The band of event types loops, speeds up with the scroll and can be paused (WCAG 2.2.2). */
export function marquee({ gsap, ScrollTrigger }: Libs, root: ParentNode): Cleanup {
  const band = root.querySelector<HTMLElement>('.marquee');
  const track = band?.querySelector<HTMLElement>('.track');
  if (!band || !track) return noop;
  const toggle = band.querySelector<HTMLButtonElement>('.marquee-toggle');
  const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
  let paused = false;
  ScrollTrigger.create({
    trigger: band,
    start: 'top bottom',
    end: 'bottom top',
    onUpdate: (s) => {
      if (paused) return;
      const v = clamp(Math.abs(s.getVelocity()) / 600, 0, 5);
      const dir = s.direction < 0 ? -1 : 1;
      gsap.to(loop, { timeScale: dir * (1 + v), duration: 0.3, overwrite: true });
      gsap.to(loop, { timeScale: dir, duration: 1.2, delay: 0.3, overwrite: false });
    },
  });
  if (!toggle) return noop;
  const onToggle = (): void => {
    paused = !paused;
    toggle.setAttribute('aria-pressed', String(paused));
    gsap.killTweensOf(loop);
    if (paused) loop.pause();
    else loop.timeScale(1).play();
  };
  toggle.hidden = false;
  toggle.addEventListener('click', onToggle);
  return () => {
    toggle.removeEventListener('click', onToggle);
    toggle.hidden = true;
    toggle.setAttribute('aria-pressed', 'false');
  };
}

/** "Same day": the progress line fills and the steps light up; pinned on desktop only. */
export function sameDay({ gsap }: Libs, root: ParentNode, desktop: boolean): Cleanup {
  const day = root.querySelector<HTMLElement>('.day');
  const line = day?.querySelector('.progress i');
  if (!day || !line) return noop;
  const steps = [...day.querySelectorAll('.step')];
  gsap.fromTo(
    line,
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: day,
        start: desktop ? 'top top' : 'top 70%',
        end: desktop ? '+=110%' : 'bottom 60%',
        scrub: true,
        pin: desktop,
        onUpdate: (s) =>
          steps.forEach((el, i) =>
            el.classList.toggle('is-on', s.progress >= i / steps.length + 0.02),
          ),
      },
    },
  );
  return () => steps.forEach((el) => el.classList.add('is-on'));
}

/** The header hides while scrolling down (never while it holds keyboard focus). */
export function headerHide({ ScrollTrigger }: Libs, root: ParentNode): Cleanup {
  const top = root.querySelector<HTMLElement>('header.top');
  if (!top) return noop;
  ScrollTrigger.create({
    start: 120,
    end: 'max',
    onUpdate: (s) =>
      top.classList.toggle(
        'is-hidden',
        s.direction === 1 && s.scroll() > 200 && !top.matches(':focus-within'),
      ),
  });
  const onFocus = (): void => top.classList.remove('is-hidden');
  top.addEventListener('focusin', onFocus);
  return () => {
    top.removeEventListener('focusin', onFocus);
    top.classList.remove('is-hidden');
  };
}

/** Surfaces the header may blend over: flat colour, no photo. Checked against what is really under it. */
const FLAT = '.light, .marquee, .foot, .about, .translation-todo';
const PHOTO = 'img, picture, canvas, video, .dph, .media, .frame';
/** How often the header checks what is under it while scrolling (ms) */
const BLEND_CHECK_MS = 120;

/**
 * `.blend` (mix-blend-mode: difference, header.css) only while every point of the header strip lies over a flat
 * night or light surface; never over a photo, a canvas or a wipe. The CSS turns it off on :focus-visible.
 */
export function headerBlend(root: Document): Cleanup {
  const top = root.querySelector<HTMLElement>('header.top');
  if (!top) return noop;
  const overFlat = (): boolean => {
    const h = top.offsetHeight;
    const w = innerWidth;
    for (const y of [2, h / 2, h - 2]) {
      for (const x of [4, w * 0.25, w * 0.5, w * 0.75, w - 4]) {
        const under = root.elementsFromPoint(x, y).find((el) => !top.contains(el));
        if (!under || under.closest(PHOTO) || !under.closest(FLAT)) return false;
      }
    }
    return true;
  };
  let timer = 0;
  const check = (): void => {
    timer = 0;
    top.classList.toggle('blend', overFlat());
  };
  const schedule = (): void => {
    if (!timer) timer = window.setTimeout(check, BLEND_CHECK_MS);
  };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  check();
  return () => {
    removeEventListener('scroll', schedule);
    removeEventListener('resize', schedule);
    clearTimeout(timer);
    top.classList.remove('blend');
  };
}
