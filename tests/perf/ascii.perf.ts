import { test, expect } from '@playwright/test';

/** CPU slowdown that stands in for a mid-range phone */
const CPU_THROTTLE = 4;
/** Intro (2.4 s) plus 3 s of the drifting lens */
const MEASURE_MS = 5400;

const percentile = (sorted: number[], p: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;

test('ASCII hero keeps the frame budget on a throttled phone', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
  await page.addInitScript((ms: number) => {
    const w = window as unknown as { __frames: number[]; __framesDone: boolean };
    w.__frames = [];
    w.__framesDone = false;
    let last = -1;
    let first = -1;
    const frame = (t: number): void => {
      if (first < 0) first = t;
      if (last >= 0) w.__frames.push(t - last);
      last = t;
      if (t - first < ms) requestAnimationFrame(frame);
      else w.__framesDone = true;
    };
    requestAnimationFrame(frame);
  }, MEASURE_MS);
  await page.goto('/');
  await page.waitForFunction('window.__framesDone === true', undefined, {
    timeout: MEASURE_MS * 4,
  });
  const intro = await page.locator('.hero').getAttribute('data-ascii-intro');
  const frames = (await page.evaluate('window.__frames')) as number[];
  const sorted = [...frames].sort((a, b) => a - b);
  const median = percentile(sorted, 0.5);
  const p95 = percentile(sorted, 0.95);
  console.log(
    `frames=${frames.length} median=${median.toFixed(1)}ms p95=${p95.toFixed(1)}ms intro=${intro ?? '-'}`,
  );
  expect(median).toBeLessThanOrEqual(16.7);
  expect(p95).toBeLessThanOrEqual(50);
});
