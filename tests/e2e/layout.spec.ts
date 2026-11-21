import { test, expect } from './fixtures';

for (const path of ['/', '/en/']) {
  test(`no horizontal scroll at 360px ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(path);
    const [sw, cw] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(sw).toBeLessThanOrEqual(cw);
  });

  test(`prices come from config ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('#sluzby, #services')).toContainText(
      path === '/' ? '1 500 Kč' : 'CZK 1,500',
    );
  });

  // T3-09: one card for events, one for matches, one shared by the short shoot and the portrait
  test(`services show three cards and two add-ons ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator('.services .svc')).toHaveCount(3);
    await expect(page.locator('.addons .addon')).toHaveCount(2);
  });

  test(`footer shows the public e-mail and TODOs for missing legal data ${path}`, async ({
    page,
  }) => {
    await page.goto(path);
    const foot = page.locator('footer.foot');
    await expect(foot.getByRole('link', { name: 'foto@martinruzek.cz' })).toHaveAttribute(
      'href',
      'mailto:foto@martinruzek.cz',
    );
    await expect(foot.locator('.legal .todo')).toHaveCount(2); // IČO, seat
  });
}

// Lead note T4-02: the longest English estimate (12 h + both add-ons) must wrap inside the estimate box at 360 px
test('the longest English estimate fits the estimate box at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/en/');
  const out = page.locator('.est output');
  await out.evaluate((el) => {
    el.textContent = 'CZK 16,000–21,110';
  });
  const fits = await page
    .locator('.est')
    .evaluate(
      (box) =>
        box.scrollWidth <= box.clientWidth && document.documentElement.scrollWidth <= innerWidth,
    );
  expect(fits).toBe(true);
});
