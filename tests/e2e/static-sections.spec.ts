import { test, expect } from '@playwright/test';

for (const path of ['/', '/en/']) {
  test(`no horizontal scroll ${path}`, async ({ page }) => {
    await page.goto(path);
    const [sw, cw] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(sw).toBeLessThanOrEqual(cw);
  });

  test(`header fits on one line and the language switch is reachable ${path}`, async ({ page }) => {
    await page.goto(path);
    const header = await page.locator('header.top').boundingBox();
    expect(header?.height).toBeLessThan(90);
    await expect(page.locator('header .lang a')).toBeVisible();
    await expect(page.locator('header nav li').last()).toBeVisible();
  });
}

test('hero photo is preloaded with the same AVIF srcset the picture uses', async ({ page }) => {
  await page.goto('/');
  const preload = await page.locator('link[rel="preload"][as="image"]').getAttribute('imagesrcset');
  const source = await page
    .locator('.hero picture source[type="image/avif"]')
    .getAttribute('srcset');
  expect(preload).toBeTruthy();
  expect(preload).toBe(source);
  const img = page.locator('.hero img');
  await expect(img).toHaveAttribute('fetchpriority', 'high');
  await expect(img).toHaveAttribute('loading', 'eager');
  await expect(page.locator('.fold img').first()).toHaveAttribute('loading', 'lazy');
});

test('decorative canvases are hidden and the logo has one accessible name', async ({ page }) => {
  await page.goto('/');
  const canvases = await page
    .locator('canvas')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-hidden')));
  expect(canvases.length).toBeGreaterThan(0);
  expect(canvases.every((v) => v === 'true')).toBe(true);
  // the home link carries the name; the SVG inside is hidden from assistive technology
  await expect(page.locator('header .mark')).toHaveAttribute('aria-label', /Martin Růžek/);
  await expect(page.locator('header svg')).toHaveAttribute('aria-hidden', 'true');
  expect(await page.locator('[role="img"][aria-label*="Logo"]').count()).toBe(0);
});

test('marquee has a pause button with a pressed state, second copy is hidden', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.marquee-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toContainText('Pozastavit');
  await expect(page.locator('.marquee ul').nth(1)).toHaveAttribute('aria-hidden', 'true');
});

test('reduced motion: marquee shows every item once, wrapped, with no button', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.marquee ul').nth(1)).toBeHidden();
  await expect(page.locator('.marquee-toggle')).toBeHidden();
  const [sw, cw] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(sw).toBeLessThanOrEqual(cw);
  const items = page.locator('.marquee ul').first().locator('li');
  const last = await items.last().boundingBox();
  const viewport = page.viewportSize();
  expect((last?.x ?? 0) + (last?.width ?? 0) - 32).toBeLessThanOrEqual(viewport?.width ?? 0);
});

test('keyboard focus is visible on the header links', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // home link
  const outline = await page
    .locator('header .mark')
    .evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

// RZ2-11: the hero name and the paragraph below must not jump when the web fonts arrive late.
test('font swap does not shift the hero name or the paragraph below it', async ({ page }) => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route(/\.woff2(\?|$)/, async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const boxes = () =>
    page.evaluate(() => {
      const rect = (sel: string) => {
        const r = (document.querySelector(sel) as HTMLElement).getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      };
      return { name: rect('#name'), lead: rect('.hero .row p') };
    });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => [...document.fonts].some((f) => f.status === 'loaded'))).toBe(
    false,
  );
  // Which font is the browser really using while the web fonts are pending? The metric-adjusted fallback is
  // `local("Arial")`; a machine without Arial (e.g. this Linux box: DejaVu Sans) falls through to system-ui,
  // whose widths no CSS can match. Then only a looser bound is checked.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '.hero .row p',
  });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  const adjusted = fonts.some((f) =>
    /arial|helvetica|nimbus sans|liberation sans/i.test(f.familyName),
  );
  const tolerance = adjusted ? 6 : 34; // 34 px is about one more line of the paragraph at 1440 px
  if (!adjusted) {
    test.info().annotations.push({
      type: 'note',
      description: `metric-adjusted fallback not available (${fonts.map((f) => f.familyName).join(', ')}): tolerance ${tolerance}px`,
    });
  }
  const before = await boxes();
  release();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.fonts].some((f) => f.status === 'loaded'));
  await page.waitForTimeout(300);
  const after = await boxes();
  // with the adjusted fallback the swap is a few pixels, not a line
  for (const key of ['name', 'lead'] as const) {
    expect(Math.abs(after[key].y - before[key].y), `${key} y`).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(after[key].h - before[key].h), `${key} height`).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(after[key].x - before[key].x), `${key} x`).toBeLessThanOrEqual(tolerance);
  }
});
