import { test, expect, type Page } from './fixtures';

// Selected work, "three speeds" (WorkGrid.astro, work.css, motion/work.ts)

const motionOn = (): boolean => document.documentElement.dataset['motion'] === 'on';

/** Bottom edge of every column of the gallery (px from its top), keyed by the column's left edge */
const columnBottoms = (page: Page): Promise<number[]> =>
  page.locator('[data-work]').evaluate((work) => {
    const box = work.getBoundingClientRect();
    const cols = new Map<number, number>();
    for (const shot of work.querySelectorAll('.shot')) {
      const r = shot.getBoundingClientRect();
      const left = Math.round(r.left - box.left);
      cols.set(left, Math.max(cols.get(left) ?? 0, r.bottom - box.top));
    }
    return [...cols.values()];
  });

/** Largest vertical gap between two photos that follow each other in one column (px) */
const largestGap = (page: Page): Promise<number> =>
  page.locator('[data-work]').evaluate((work) => {
    const byCol = new Map<number, DOMRect[]>();
    for (const shot of work.querySelectorAll('.shot')) {
      const r = shot.getBoundingClientRect();
      const left = Math.round(r.left);
      byCol.set(left, [...(byCol.get(left) ?? []), r]);
    }
    let gap = 0;
    for (const rects of byCol.values()) {
      rects.sort((a, b) => a.top - b.top);
      for (let i = 1; i < rects.length; i++)
        gap = Math.max(gap, (rects[i]?.top ?? 0) - (rects[i - 1]?.bottom ?? 0));
    }
    return gap;
  });

test('reduced motion: a still, complete layout with no holes', async ({ page, viewport }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const shots = page.locator('[data-work] .shot');
  expect(await shots.count()).toBeGreaterThanOrEqual(8);
  // nothing translated: no lane, photo or media carries a transform
  const moved = await page
    .locator('[data-work] [data-lane], [data-work] .shot, [data-work] .media')
    .evaluateAll((els) => els.filter((el) => getComputedStyle(el).transform !== 'none').length);
  expect(moved).toBe(0);
  const cols = await columnBottoms(page);
  expect(cols.length).toBe((viewport?.width ?? 0) >= 1100 ? 3 : 1);
  // the columns end together and no photo leaves more than the lane gap above the next one
  expect(Math.max(...cols) - Math.min(...cols)).toBeLessThan(4);
  expect(await largestGap(page)).toBeLessThanOrEqual(33);
  await expect(page.locator('[data-work] canvas.dz')).toBeHidden();
});

test('360 px: one column, full width, no horizontal scroll', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) > 360, 'phone layout');
  await page.goto('/');
  await page.waitForFunction(motionOn);
  await page.locator('[data-work]').scrollIntoViewIfNeeded();
  const lefts = await page
    .locator('[data-work] .shot')
    .evaluateAll((els) => [...new Set(els.map((el) => Math.round(el.getBoundingClientRect().left)))]);
  expect(lefts.length).toBe(1);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  // the photo drifts inside its frame, the frame and its link stay put
  const shot = page.locator('[data-work] .shot').nth(1);
  await shot.scrollIntoViewIfNeeded();
  await expect(shot.locator('.media')).not.toHaveCSS('transform', 'none');
  await expect(shot).toHaveCSS('transform', 'none');
});

test('desktop: the three lanes move at three speeds, the middle one against the outer two', async ({
  page,
  viewport,
}) => {
  test.skip((viewport?.width ?? 0) < 1100, 'three lanes from 1100 px');
  await page.goto('/');
  await page.waitForFunction(motionOn);
  const offsets = (): Promise<number[]> =>
    page
      .locator('[data-work] [data-lane]')
      .evaluateAll((lanes) => lanes.map((el) => new DOMMatrix(getComputedStyle(el).transform).m42));
  const scrollTo = async (fraction: number): Promise<void> => {
    await page.locator('[data-work]').evaluate((work, f) => {
      const top = work.getBoundingClientRect().top + scrollY;
      window.scrollTo(0, top - innerHeight + f * (work.offsetHeight + innerHeight));
    }, fraction);
    await page.waitForTimeout(600); // Lenis settles
  };
  await scrollTo(0.2);
  const [l1 = 0, m1 = 0, r1 = 0] = await offsets();
  await scrollTo(0.6);
  const [l2 = 0, m2 = 0, r2 = 0] = await offsets();
  const [left, middle, right] = [l2 - l1, m2 - m1, r2 - r1];
  expect(left).toBeLessThan(-10); // rises faster than the page
  expect(right).toBeLessThan(left * 1.5); // faster still
  expect(middle).toBeGreaterThan(10); // lags, against the other two
});

test('scrolling through the gallery shifts no layout', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionOn);
  await page.evaluate(() => {
    const w = window as Window & { __shift?: number };
    w.__shift = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { value: number })[])
        w.__shift = (w.__shift ?? 0) + e.value;
    }).observe({ type: 'layout-shift' });
  });
  const work = page.locator('[data-work]');
  const box = await work.evaluate((el) => ({
    top: el.getBoundingClientRect().top + scrollY,
    height: el.offsetHeight,
  }));
  await page.evaluate((y) => window.scrollTo(0, y), box.top - 900);
  await page.waitForTimeout(600);
  for (let y = box.top - 900; y < box.top + box.height; y += 300) {
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(80);
  }
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => (window as Window & { __shift?: number }).__shift)).toBe(0);
});

test('the lightbox carries the category and the place; the tiles carry no captions', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-work] .cap')).toHaveCount(0);
  const shot = page.locator('[data-work] .shot').first();
  await expect(shot).toHaveAttribute('data-lb', /^(Akce|Sport|Portrét) – TODO: místo a\u00A0datum$/);
  await shot.click();
  await expect(page.locator('dialog.lb .lb-cap')).toHaveText(/^(Akce|Sport|Portrét) – TODO/);
});

test('a focused photo is never covered by the dither', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionOn);
  const lead = page.locator('[data-work] .shot:has(canvas.dz)');
  await expect(lead).toHaveCount(1);
  await lead.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(lead).toBeFocused();
  await expect(lead.locator('canvas.dz')).toHaveCSS('visibility', 'hidden');
});
