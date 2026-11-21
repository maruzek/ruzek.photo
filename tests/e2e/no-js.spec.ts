import { test, expect } from '@playwright/test';

test('content becomes visible when JS modules never load', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/');
  await page.waitForTimeout(3200);
  const els = await page.locator('[data-rise], [data-stagger] > *').all();
  expect(els.length).toBeGreaterThan(0);
  for (const el of els) await expect(el).toHaveCSS('opacity', '1');
});

test('elements start hidden under html.motion, so the CSS safety net is what reveals them', async ({
  page,
}) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bmotion\b/);
  await expect(page.locator('[data-rise]').first()).toHaveCSS('opacity', '0');
});

test('reduced motion: html.rm and everything visible at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\brm\b/);
  await expect(page.locator('[data-rise]').first()).toHaveCSS('opacity', '1');
});
