// Smooth wheel scrolling (prototype: rozpad.js "Lenis + GSAP wiring"). Touch keeps native scrolling, and the
// keyboard keeps working because Lenis follows native scroll positions. Anchor links scroll with Lenis and
// then move focus to their target (sections carry tabindex="-1").
import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

export interface LenisHandle {
  lenis: Lenis;
  stop(): void;
  start(): void;
  destroy(): void;
}

const DURATION = 1.15;
const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);
const easing = (t: number): number => Math.min(1, 1.001 - 2 ** (-10 * t));

export function startLenis(gsap: typeof Gsap, ScrollTrigger: typeof ST): LenisHandle {
  const lenis = new Lenis({
    duration: DURATION,
    easing,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: false,
    // an open dialog (the lightbox) handles its own wheel and keys
    prevent: (node) => node.closest('dialog') !== null,
  });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time: number): void => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  const onClick = (event: MouseEvent): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    const hash = link?.getAttribute('href') ?? '';
    if (!link || hash.length < 2) return;
    const [id = '', params] = hash.slice(1).split('?', 2);
    const target = document.getElementById(decodeURIComponent(id));
    if (!target) return;
    event.preventDefault();
    // Lenis already accounts for the CSS scroll-padding. Prefill also needs hashchange, including for a hydrated form.
    lenis.scrollTo(target, {
      immediate: event.detail === 0 || params !== undefined,
      onComplete: () => target.focus({ preventScroll: true }),
    });
    if (params === undefined) history.replaceState(null, '', hash);
    else if (window.location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
    else window.location.hash = hash;
  };
  document.addEventListener('click', onClick);

  // A scroll key during wheel inertia: stop the interpolation where it is and let the browser's own key action run;
  // otherwise Lenis keeps easing towards its old target and overrides the key (HM-08).
  const onKey = (event: KeyboardEvent): void => {
    if (!SCROLL_KEYS.has(event.key) || lenis.isScrolling !== 'smooth') return;
    const target = event.target as Element | null;
    if (target?.closest('input, textarea, select, [contenteditable], dialog')) return;
    lenis.scrollTo(lenis.animatedScroll, { immediate: true, force: true });
  };
  document.addEventListener('keydown', onKey, { capture: true });

  return {
    lenis,
    stop: () => lenis.stop(),
    start: () => lenis.start(),
    destroy: () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey, { capture: true });
      gsap.ticker.remove(raf);
      lenis.destroy();
    },
  };
}
