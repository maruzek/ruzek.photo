import { test, expect } from '@playwright/test';

// The motion layer reports its state on <html data-motion="on|off"> (no global in the production build, which
// is what the e2e suite tests).
const motionIs = (state: 'on' | 'off'): string =>
  `document.documentElement.dataset.motion === '${state}'`;

test('reduced motion: no GSAP/Lenis downloaded, everything visible', async ({ page }) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForLoadState('networkidle');
  expect(scripts.some((u) => /gsap|lenis|start|choreo/i.test(u))).toBe(false);
  for (const el of await page.locator('[data-split], [data-rise], .step').all())
    await expect(el).toBeVisible();
  await expect(page.locator('canvas.ascii')).toBeHidden();
});

test('motion starts, sets motion-ready and runs Lenis', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs('on'));
  await expect(page.locator('html')).toHaveClass(/\bmotion-ready\b/);
  await expect(page.locator('html')).toHaveClass(/\blenis\b/);
});

test('switching to reduced motion at runtime settles the page', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs('on'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(motionIs('off'));
  await expect(page.locator('html')).not.toHaveClass(/lenis-smooth/);
  await expect(page.locator('html')).not.toHaveClass(/\bmotion\b/);
  for (const el of await page.locator('[data-split], [data-rise], .step, #name').all()) {
    await expect(el).toHaveCSS('opacity', '1');
  }
  await expect(page.locator('.marquee .track')).toHaveCSS('transform', 'none');
});

// Review Focus 2: GSAP arriving after the 3 s fallback must not hide the content again
test('a late motion layer skips entrance animations', async ({ page }) => {
  await page.route(/\/_astro\/.*\.js$/, async (route) => {
    if (route.request().url().includes('start')) await new Promise((r) => setTimeout(r, 3600));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/reveal-fallback/, { timeout: 5000 });
  await page.waitForFunction(motionIs('on'), undefined, { timeout: 15_000 });
  await expect(page.locator('#name')).toHaveCSS('opacity', '1');
  const nameTransforms = await page
    .locator('#name *')
    .evaluateAll((els) =>
      els
        .map((el) => getComputedStyle(el).transform)
        .filter((t) => t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'),
    );
  expect(nameTransforms).toEqual([]);
  for (const el of await page.locator('[data-split], [data-rise]').all())
    await expect(el).toHaveCSS('opacity', '1');
});

test('open lightbox blocks page scroll (wheel, space, arrows)', async ({ page }) => {
  await page.goto('/#prace');
  await page.waitForFunction(motionIs('on'));
  await page.locator('[data-lb]').first().click();
  const y = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 800);
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => scrollY)).toBe(y);
  await page.keyboard.press('Escape');
  await page.mouse.move(200, 400);
  await page.mouse.wheel(0, 800);
  await page.waitForTimeout(600);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(y);
});

test('anchor link moves focus to the section', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) <= 900, 'the services link is in the desktop navigation only');
  await page.goto('/');
  await page.waitForFunction(motionIs('on'));
  await page.getByRole('link', { name: /Služby a ceny/ }).click();
  await expect(page.locator('#sluzby')).toBeFocused();
});

test('marquee can be paused', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs('on'));
  const toggle = page.locator('.marquee-toggle');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const a = await page.locator('.marquee .track').evaluate((e) => getComputedStyle(e).transform);
  await page.waitForTimeout(500);
  expect(await page.locator('.marquee .track').evaluate((e) => getComputedStyle(e).transform)).toBe(
    a,
  );
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('header blends only over flat sections and never over photos', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs('on'));
  const header = page.locator('header.top');
  await expect(header).not.toHaveClass(/\bblend\b/); // over the hero photo
  // the heading block of the services section: flat light surface under the whole header strip
  await page.evaluate(() => {
    const head = document.querySelector('.svc-sec .sec-head') as HTMLElement;
    window.scrollTo(0, head.getBoundingClientRect().top + scrollY - 4);
  });
  await expect(header).toHaveClass(/\bblend\b/);
  await page.evaluate(() => {
    const fold = document.querySelector('.fold') as HTMLElement;
    window.scrollTo(0, fold.getBoundingClientRect().top + scrollY + fold.offsetHeight / 2);
  });
  await expect(header).not.toHaveClass(/\bblend\b/);
});
