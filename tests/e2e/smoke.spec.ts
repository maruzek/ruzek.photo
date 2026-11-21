import { test, expect } from './fixtures';

test('home responds with Czech lang', async ({ page }) => {
  const res = await page.goto('/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
});
