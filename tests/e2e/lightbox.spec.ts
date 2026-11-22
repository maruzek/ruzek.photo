import { test, expect } from './fixtures';

test('lightbox keyboard and focus return', async ({ page }) => {
  await page.goto('/');
  const shot = page.locator('[data-lb]').nth(1);
  const total = String(await page.locator('[data-lb]').count()).padStart(2, '0');
  await shot.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('dialog.lb')).toHaveAttribute('open', '');
  await expect(page.locator('.lb-no')).toHaveText(`02 / ${total}`);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.lb-no')).toHaveText(`03 / ${total}`);
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
  // the tile shows only its frame number; the category and the place are in the lightbox caption
  await expect(page.locator('dialog.lb .lb-cap')).toHaveText(
    /^\d{2} · (Event|Sport|Portrait) · (TODO: place and date|.+)$/,
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

// HM-12: a placeholder photo is marked in the grid and in the dialog, a real photo never is
test('placeholder photos are marked in the work grid and the lightbox', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.cs-print:not([data-placeholder]) .ph-tag')).toHaveCount(0);
  const shots = page.locator('.cs-print[data-placeholder]');
  test.skip((await shots.count()) === 0, 'the work grid has no placeholder photo');
  expect(await page.locator('.cs-print[data-placeholder] .cs-box .ph-tag').count()).toBe(
    await shots.count(),
  );
  await expect(shots.first().locator('.ph-tag')).toHaveText('Zástupná fotka');
  await shots.first().click();
  await expect(page.locator('dialog.lb .lb-ph')).toBeVisible();
  await expect(page.locator('dialog.lb .lb-ph')).toHaveText('Zástupná fotka');
});
