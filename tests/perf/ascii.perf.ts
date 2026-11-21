import { test, expect } from '@playwright/test';

/** CPU slowdown that stands in for a mid-range phone */
const CPU_THROTTLE = 4;
/** Intro (2.4 s) plus 3 s of the drifting lens, counted from the confirmed intro start */
const MEASURE_MS = 5400;
/** Fewer frames than this means the effect was not measured at all */
const MIN_FRAMES = 60;
/** The photo arrives after the ASCII module, as on a real first visit (a loaded photo skips the intro) */
const PHOTO_DELAY_MS = 800;

const percentile = (sorted: number[], p: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;

interface Probe {
  frames: number[];
  done: boolean;
  intro: string;
  lensAfterLite: string[];
}

test('ASCII hero keeps the frame budget on a throttled phone', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
  await page.route(/smoke\.[^/]*\.(avif|webp|jpg)$/, async (route) => {
    await new Promise((r) => setTimeout(r, PHOTO_DELAY_MS));
    await route.continue();
  });
  await page.addInitScript((ms: number) => {
    const probe: Probe = { frames: [], done: false, intro: '', lensAfterLite: [] };
    (window as unknown as { __probe: Probe }).__probe = probe;
    const measure = (): void => {
      let last = -1;
      let first = -1;
      const frame = (t: number): void => {
        if (first < 0) first = t;
        if (last >= 0) probe.frames.push(t - last);
        last = t;
        if (t - first < ms) requestAnimationFrame(frame);
        else probe.done = true;
      };
      requestAnimationFrame(frame);
    };
    document.addEventListener('DOMContentLoaded', () => {
      const hero = document.querySelector<HTMLElement>('.hero');
      if (!hero) return;
      new MutationObserver(() => {
        const intro = hero.dataset['asciiIntro'] ?? '';
        if (!probe.intro && (intro === 'running' || intro === 'lite')) measure();
        if (intro) probe.intro = intro;
        if (probe.intro === 'lite') probe.lensAfterLite.push(hero.dataset['asciiLens'] ?? '');
      }).observe(hero, {
        attributes: true,
        attributeFilter: ['data-ascii-intro', 'data-ascii-lens'],
      });
    });
  }, MEASURE_MS);

  await page.goto('/');
  // function form: a string expression is eval'd in the page and the CSP (script-src without unsafe-eval) refuses it
  await page.waitForFunction(
    () => (window as unknown as { __probe: Probe }).__probe.done,
    undefined,
    {
      timeout: MEASURE_MS * 4,
    },
  );
  const probe = await page.evaluate(() => (window as unknown as { __probe: Probe }).__probe);
  const sorted = [...probe.frames].sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  console.log(
    `frames=${sorted.length} median=${median.toFixed(1)}ms p95=${p95.toFixed(1)}ms intro=${probe.intro} lensAfterLite=${probe.lensAfterLite.join(',') || '-'}`,
  );
  expect(sorted.length).toBeGreaterThanOrEqual(MIN_FRAMES);
  expect(median).toBeLessThanOrEqual(16.7);
  expect(p95).toBeLessThanOrEqual(50);
  // `lite` turns the lens off and it stays off
  if (probe.intro === 'lite') expect(probe.lensAfterLite.every((l) => l === 'off')).toBe(true);
});
