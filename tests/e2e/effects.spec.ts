import { test, expect } from './fixtures';

// State of the ASCII hero is on the hero element: data-ascii-intro (running | done | skipped | lite) and
// data-ascii-lens (off | tracking | drift | idle). No global in the production build the suite tests.

// The plan asked for "LCP element is IMG". Chrome does not report the placeholder hero photo as an LCP
// candidate at all, not even with reduced motion where no canvas effect runs, so the test checks what this code
// controls: the photo is requested first and is loaded and visible under the ASCII canvas by the load event.
test('the hero photo loads first and is not held back by the ASCII canvas', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const img = page.locator('.hero .media img');
  await expect(img).toHaveAttribute('fetchpriority', 'high');
  await expect(img).toHaveAttribute('loading', 'eager');
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(
    true,
  );
  await expect(img).toBeVisible();
});

test('reduced motion: dither and ASCII canvases hidden, wipes painted statically', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const cv of await page.locator('canvas.dz, canvas.ascii').all())
    await expect(cv).toBeHidden();
  const wipes = page.locator('canvas.dwipe');
  expect(await wipes.count()).toBeGreaterThan(0);
  for (const cv of await wipes.all()) await expect(cv).toHaveAttribute('data-painted', 'static');
  // the destination colour grows from the bottom edge, where the next zone starts: the bottom row is all `to`,
  // the top row at most half (one Bayer row), so neither edge of the band is a hard line
  const rows = await wipes.first().evaluate((cv: HTMLCanvasElement) => {
    const ctx = cv.getContext('2d');
    const to = cv.dataset['to'] ?? '';
    const isTo = (row: number): number => {
      const { data } = ctx?.getImageData(0, row, cv.width, 1) ?? { data: new Uint8ClampedArray() };
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const hex = [data[i], data[i + 1], data[i + 2]]
          .map((v) => (v ?? 0).toString(16).padStart(2, '0'))
          .join('');
        if (`#${hex}` === to.toLowerCase()) n++;
      }
      return n / cv.width;
    };
    return { top: isTo(0), bottom: isTo(cv.height - 1) };
  });
  expect(rows.bottom).toBe(1);
  expect(rows.top).toBeLessThanOrEqual(0.5);
  await expect(page.locator('.hero')).not.toHaveAttribute('data-ascii-intro', /.+/);
});

test('a repeat visit with the photo in cache skips the intro', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.goto('/');
  await expect(page.locator('.hero')).toHaveAttribute('data-ascii-intro', 'skipped');
});

test('motion: dither canvases draw while in view', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset['motion'] === 'on');
  await page.evaluate(() => document.querySelector('.fold')?.scrollIntoView({ block: 'start' }));
  await expect(page.locator('.fold canvas.dz').first()).toHaveAttribute('data-painted', 'live');
  await page.evaluate(() =>
    document.querySelector('canvas.dwipe')?.scrollIntoView({ block: 'center' }),
  );
  await expect(page.locator('canvas.dwipe').first()).toHaveAttribute('data-painted', 'live');
});

test('on touch the lens drifts for 5 s and then stops', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-360', 'touch only');
  await page.goto('/');
  const hero = page.locator('.hero');
  await expect(hero).toHaveAttribute('data-ascii-lens', 'drift');
  await expect(hero).toHaveAttribute('data-ascii-lens', 'idle', { timeout: 8000 });
});

// HM-03: a page the 3 s fallback already revealed never gets the photo covered again
test('the intro is skipped once the fallback has revealed the page', async ({ page }) => {
  await page.route(/smoke\.[^/]*\.(avif|webp|jpg)$/, async (route) => {
    await new Promise((r) => setTimeout(r, 3600));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/reveal-fallback/, { timeout: 5000 });
  await expect(page.locator('.hero')).toHaveAttribute('data-ascii-intro', 'skipped', {
    timeout: 8000,
  });
});

// HM-11: `lite` (here: little device memory) has no pointer lens
test('quality lite never turns the lens on', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'pointer lens is desktop only');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
  });
  await page.goto('/');
  const hero = page.locator('.hero');
  await expect(hero).toHaveAttribute('data-ascii-lens', 'off');
  await page.mouse.move(400, 400);
  await page.mouse.move(600, 450, { steps: 5 });
  await page.waitForTimeout(300);
  await expect(hero).toHaveAttribute('data-ascii-lens', 'off');
});
