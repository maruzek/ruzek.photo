import { test, expect } from '@playwright/test';

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
  await page.waitForFunction("document.documentElement.dataset.motion === 'on'");
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
