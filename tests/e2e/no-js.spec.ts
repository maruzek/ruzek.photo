import { test, expect, type Page } from '@playwright/test';

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
  // the page has animated elements (the two fold headings so far); every one starts hidden
  expect(initial.length).toBeGreaterThan(0);
  expect(initial.every((o) => o === '0')).toBe(true);

  await expect
    .poll(opacities, { timeout: LIMIT_MS - (Date.now() - started), intervals: [100] })
    .toEqual(initial.map(() => '1'));
  expect(Date.now() - started).toBeLessThanOrEqual(LIMIT_MS);
});

// The page has no [data-stagger] group yet, so the next two tests add one (the CSS rule matches at insertion)
async function addStaggerGroup(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<ul data-stagger><li><a href="#a">first</a></li><li><a href="#b">second</a></li></ul>'
    );
  });
  // right after insertion the first style read can still say 1; wait until the rule has really hidden them
  await expect(page.locator('[data-stagger] > li').first()).toHaveCSS('opacity', '0');
}

test('a focused link inside a stagger group is visible at once', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await addStaggerGroup(page);
  const link = page.locator('[data-stagger] a').first();
  await link.focus();
  await expect(link).toBeFocused();
  // well before the 3 s timer: the group item holding focus is already opaque, the other one is not
  await expect(page.locator('[data-stagger] > li').first()).toHaveCSS('opacity', '1', { timeout: 1000 });
  await expect(page.locator('[data-stagger] > li').nth(1)).toHaveCSS('opacity', '0', { timeout: 500 });
});

test('content revealed by the fallback stays visible after focus leaves it', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await addStaggerGroup(page);
  const first = page.locator('[data-stagger] > li').first();
  await expect(first).toHaveCSS('opacity', '1', { timeout: 3500 });
  await page.locator('[data-stagger] a').first().focus();
  await page.locator('[data-stagger] a').nth(1).focus();
  await page.waitForTimeout(300);
  await expect(first).toHaveCSS('opacity', '1', { timeout: 100 });
});

test('reduced motion: html.rm and everything visible at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\brm\b/);
  await expect(page.locator('[data-split]').first()).toHaveCSS('opacity', '1');
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
