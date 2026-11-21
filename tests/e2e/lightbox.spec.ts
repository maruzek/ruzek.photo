import { test, expect } from '@playwright/test';

test('lightbox keyboard and focus return', async ({ page }) => {
  await page.goto('/');
  const shot = page.locator('[data-lb]').nth(1);
  await shot.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog.lb')).toHaveAttribute('open', '');
  await expect(page.locator('.lb-no')).toHaveText('02 / 08');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lb-no')).toHaveText('03 / 08');
  await page.keyboard.press('Escape');
  await expect(shot).toBeFocused();
});

test('lightbox shows the large file and the caption', async ({ page }) => {
  await page.goto('/en/');
  const shot = page.locator('[data-lb]').first();
  await shot.click();
  const img = page.locator('dialog.lb .lb-stage img');
  await expect(img).toHaveAttribute('src', (await shot.getAttribute('data-full')) ?? 'missing');
  await expect(img).not.toHaveAttribute('alt', '');
  await expect(page.locator('dialog.lb .lb-cap')).toHaveText(
    (await shot.getAttribute('data-lb')) ?? 'missing',
  );
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('dialog.lb')).not.toHaveAttribute('open', '');
});

// concept §7: without JavaScript a photo is a plain link to the full image
test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('a work photo links to its full image', async ({ page }) => {
    await page.goto('/');
    const shot = page.locator('[data-lb]').first();
    await expect(shot).toHaveAttribute('href', /\/_astro\/.+\.(webp|jpg)$/);
  });
});
