// Magnetic buttons and the "view" cursor over photos (prototype: rozpad.js, end of the choreography). Fine
// pointers only; the caller checks `(hover: hover) and (pointer: fine)`.
import type { gsap as Gsap } from 'gsap';

export function initCursor(gsap: typeof Gsap, root: Document = document): () => void {
  const off: (() => void)[] = [];
  const on = <K extends keyof HTMLElementEventMap>(
    el: HTMLElement | Window,
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
  ): void => {
    el.addEventListener(type, fn as EventListener, { passive: true });
    off.push(() => el.removeEventListener(type, fn as EventListener));
  };

  for (const b of root.querySelectorAll<HTMLElement>('[data-magnetic]')) {
    const xTo = gsap.quickTo(b, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(b, 'y', { duration: 0.5, ease: 'power3.out' });
    on(b, 'pointermove', (e) => {
      const r = b.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.28);
      yTo((e.clientY - r.top - r.height / 2) * 0.4);
    });
    on(b, 'pointerleave', () => {
      xTo(0);
      yTo(0);
    });
  }

  const cur = root.querySelector<HTMLElement>('.cur');
  if (cur) {
    const cx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3.out' });
    const cy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3.out' });
    on(window, 'pointermove', (e) => {
      cx(e.clientX);
      cy(e.clientY);
    });
    for (const el of root.querySelectorAll<HTMLElement>('[data-cursor]')) {
      on(el, 'pointerenter', () => cur.classList.add('on'));
      on(el, 'pointerleave', () => cur.classList.remove('on'));
    }
  }

  return () => {
    off.forEach((fn) => fn());
    cur?.classList.remove('on');
  };
}
