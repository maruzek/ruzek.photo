import { test, expect } from '@playwright/test';

test('fonts are self-hosted', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) external.push(r.url());
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  expect(external).toEqual([]);

  // Astro's Fonts API gives every family a unique name ("Stack Sans Notch-<hash>"), so read the real one
  // from the element that is set in --f-name instead of hard-coding it.
  const family = await page.locator('.name').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/^"Stack Sans Notch/);
  const first = family.split(',')[0] ?? '';
  expect(await page.evaluate((f) => document.fonts.check(`700 64px ${f}`), first)).toBe(true);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`)
  );
  expect(loaded.some((f) => /^"?Stack Sans Notch.* 700$/.test(f))).toBe(true);
});
