import { test, expect } from '@playwright/test';

const ANIMATED = '[data-rise], [data-split], [data-stagger] > *';
const LIMIT_MS = 3500; // the CSS safety net reveals after 3 s; 0.5 s of slack for the test runner

test('without JS everything starts hidden and is visible within 3.5 s of navigation', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  const started = Date.now();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveClass(/\bmotion\b/);

  const opacities = () =>
    page.locator(ANIMATED).evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity));
  const initial = await opacities();
  // covers [data-rise], [data-split] and both children of [data-stagger]
  expect(initial).toHaveLength(4);
  expect(initial.every((o) => o === '0')).toBe(true);

  await expect
    .poll(opacities, { timeout: LIMIT_MS - (Date.now() - started), intervals: [100] })
    .toEqual(['1', '1', '1', '1']);
  expect(Date.now() - started).toBeLessThanOrEqual(LIMIT_MS);
});

test('a focused link inside a stagger group is visible at once', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.keyboard.press('Tab');
  const link = page.locator('[data-stagger] a').first();
  await expect(link).toBeFocused();
  // well before the 3 s timer: the group item holding focus is already opaque, the other one is not
  await expect(page.locator('[data-stagger] > li').first()).toHaveCSS('opacity', '1', { timeout: 1000 });
  await expect(page.locator('[data-stagger] > li').nth(1)).toHaveCSS('opacity', '0', { timeout: 500 });
});

test('reduced motion: html.rm and everything visible at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\brm\b/);
  await expect(page.locator('[data-rise]').first()).toHaveCSS('opacity', '1');
});

test('the hidden attribute wins over component display rules', async ({ page }) => {
  await page.goto('/');
  const display = await page.evaluate(() => {
    document.head.insertAdjacentHTML('beforeend', '<style>.probe{display:flex}</style>');
    document.body.insertAdjacentHTML('beforeend', '<div class="probe" hidden></div>');
    return getComputedStyle(document.querySelector('.probe') as Element).display;
  });
  expect(display).toBe('none');
});
