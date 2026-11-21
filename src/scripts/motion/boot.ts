// First layer of the motion stack (concept.md §7), a few hundred bytes. With reduced motion or Save-Data it
// stops here and GSAP and Lenis are never downloaded. Otherwise it imports start.ts. If the visitor switches to
// reduced motion while the page is open, everything is reverted to the static page.
// The state is on <html data-motion="on|off"> (read by the e2e tests; no global in the production build).

type NetworkInformation = { saveData?: boolean };

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const saveData =
  (navigator as Navigator & { connection?: NetworkInformation }).connection?.saveData === true;

function settle(): void {
  root.classList.remove('motion', 'motion-ready');
  root.classList.add('rm');
  root.dataset['motion'] = 'off';
  // the wipes still show the zone edge, as a still pattern; this chunk has no GSAP
  void import('../effects/wipe').then(({ paintStaticWipes }) => paintStaticWipes());
}

if (reduce.matches || saveData) {
  // Save-Data without reduced motion: nothing animates, so nothing may stay hidden either
  settle();
} else {
  void import('./start').then(async ({ start }) => {
    if (reduce.matches) return settle();
    const revert = await start();
    if (reduce.matches) {
      revert();
      return settle();
    }
    root.dataset['motion'] = 'on';
    // switching back to full motion later keeps the static page (no second start in the same visit)
    const onChange = (): void => {
      if (!reduce.matches) return;
      reduce.removeEventListener('change', onChange);
      revert();
      settle();
    };
    reduce.addEventListener('change', onChange);
  }, settle);
}
