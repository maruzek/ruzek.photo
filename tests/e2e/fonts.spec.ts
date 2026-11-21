import { test, expect } from '@playwright/test';

test('fonts are self-hosted', async ({ page }) => {
  const fontRequests: string[] = [];
  const googleFonts: string[] = [];
  page.on('request', (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) googleFonts.push(r.url());
    if (r.resourceType() === 'font' || /\.(woff2?|ttf|otf)(\?|$)/i.test(r.url())) fontRequests.push(r.url());
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  // every font file comes from our own origin (no Google Fonts, jsDelivr or any other CDN)
  expect(googleFonts).toEqual([]);
  expect(fontRequests.length).toBeGreaterThan(0);
  const origin = new URL(page.url()).origin;
  expect(fontRequests.filter((u) => new URL(u).origin !== origin)).toEqual([]);

  // Astro's Fonts API gives every family a unique name ("Stack Sans Notch-<hash>"), so read the real one
  // from the element that is set in --f-name instead of hard-coding it.
  const family = await page.locator('#name').evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/^"Stack Sans Notch/);
  const first = family.split(',')[0] ?? '';
  expect(await page.evaluate((f) => document.fonts.check(`700 64px ${f}`), first)).toBe(true);
  const loaded = await page.evaluate(() =>
    [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`)
  );
  expect(loaded.some((f) => /^"?Stack Sans Notch.* 700$/.test(f))).toBe(true);
});

test('Stack Sans Notch is never below 64 px in the rendered page', async ({ page }) => {
  await page.goto('/');
  const px = await page.locator('#name').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(px).toBeGreaterThanOrEqual(64);
});

test('fallback faces have a size-adjust close to 100 % (metrics taken from the latin variant)', async ({
  page,
}) => {
  await page.goto('/');
  const adjusts = (await page.content()).match(/fallback: [^"]+";[^}]*?size-adjust:([\d.]+)%/g) ?? [];
  expect(adjusts.length).toBeGreaterThan(0);
  for (const rule of adjusts) {
    const pct = Number(/size-adjust:([\d.]+)%/.exec(rule)?.[1]);
    expect(pct, rule).toBeGreaterThan(80);
    expect(pct, rule).toBeLessThan(130);
  }
});
