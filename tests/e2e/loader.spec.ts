// Entry loader "Práh" (src/scripts/loader.ts). Uses @playwright/test directly: the shared fixture turns the loader
// off for every other spec by faking an internal referrer.
import { test, expect } from '@playwright/test';

const loaderDone = (): boolean => !document.documentElement.classList.contains('ldr-on');

test('an entry from outside shows the loader, its logo flies into the header, then the page is free', async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    // the order of hand-over and the motion layer's start, recorded as they happen
    const log: string[] = [];
    (window as unknown as { ldrLog: string[] }).ldrLog = log;
    document.addEventListener('ldr:exit', () => log.push('exit'));
    // observed from DOMContentLoaded on: an observer set up in the init script itself never fired
    document.addEventListener('DOMContentLoaded', () => {
      const html = document.documentElement;
      new MutationObserver(() => {
        if (html.classList.contains('motion-ready') && !log.includes('ready')) log.push('ready');
      }).observe(html, { attributes: true, attributeFilter: ['class'] });
    });
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\bldr-on\b/);
  await expect(page.locator('.ldr')).toBeVisible();
  // the header logo waits for the flying one
  await expect(page.locator('.top .mark .roh')).toHaveCSS('opacity', '0');

  // tiles are drawn on the canvas
  await expect
    .poll(() =>
      page.evaluate(() => {
        const cv = document.querySelector<HTMLCanvasElement>('.ldr canvas');
        const data = cv?.getContext('2d')?.getImageData(0, 0, cv.width, cv.height).data;
        if (!data) return 0;
        let lit = 0;
        for (let n = 3; n < data.length; n += 4 * 97) if ((data[n] ?? 0) > 0) lit++;
        return lit;
      }),
    )
    .toBeGreaterThan(50);

  // at hand-over the flying logo is sent exactly onto the header logo
  await page.locator('.ldr-fly.go').waitFor({ state: 'attached' });
  const flight = await page.evaluate(() => {
    const fly = document.querySelector<SVGSVGElement>('.ldr-fly')!;
    const to = document.querySelector('.top .mark .roh')!.getBoundingClientRect();
    const m = new DOMMatrix(fly.style.transform);
    const left = parseFloat(fly.style.left);
    const top = parseFloat(fly.style.top);
    const width = parseFloat(fly.style.width);
    return {
      left: left + m.e,
      top: top + m.f,
      width: width * m.a,
      to: { left: to.left, top: to.top, width: to.width },
    };
  });
  expect(flight.left).toBeCloseTo(flight.to.left, 0);
  expect(flight.top).toBeCloseTo(flight.to.top, 0);
  expect(flight.width).toBeCloseTo(flight.to.width, 0);

  await page.waitForFunction(loaderDone, undefined, { timeout: 8000 });
  await expect(page.locator('.ldr')).toBeHidden();
  await expect(page.locator('.ldr-fly')).toBeHidden();
  await expect(page.locator('.top .mark .roh')).toHaveCSS('opacity', '1');
  // the hero entrance starts only once the loader has handed over
  await page.waitForFunction(() => document.documentElement.dataset['motion'] === 'on');
  expect(await page.evaluate(() => (window as unknown as { ldrLog: string[] }).ldrLog)).toEqual([
    'exit',
    'ready',
  ]);

  // nothing is stored to remember the visit
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test('a key press ends the loader at once, so Tab never reaches a link under the curtain', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.ldr')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('html')).not.toHaveClass(/\bldr-on\b/);
  await expect(page.locator('.ldr')).toBeHidden();
  await expect(page.locator(':focus')).toBeVisible();
});

test('a key press while the logo flies also removes the curtain at once', async ({ page }) => {
  await page.goto('/');
  await page.locator('.ldr-fly.go').waitFor({ state: 'attached' });
  await page.keyboard.press('Tab');
  await expect(page.locator('html')).not.toHaveClass(/\bldr-on\b/);
  await expect(page.locator(':focus')).toBeVisible();
});

test('a slow hero photo still gets the hero entrance after the loader', async ({ page }) => {
  // the loader stops waiting at 2.5 s and hands over later than the 3 s reveal safety net would fire
  await page.route(/\/_astro\/.*\.(avif|webp|jpe?g)$/, async (route) => {
    await new Promise((r) => setTimeout(r, 4000));
    await route.continue();
  });
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset['motion'] === 'on', undefined, {
    timeout: 10000,
  });
  await expect(page.locator('html')).not.toHaveClass(/\breveal-fallback\b/);
});

test('no loader after an internal link', async ({ page, baseURL }) => {
  await page.goto('/', { referer: `${baseURL}/ochrana-osobnich-udaju/` });
  await expect(page.locator('html')).not.toHaveClass(/\bldr-on\b/);
  await expect(page.locator('.ldr')).toBeHidden();
  await expect(page.locator('.top .mark .roh')).toHaveCSS('opacity', '1');
});

test('no loader on a reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(loaderDone, undefined, { timeout: 8000 });
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/\bldr-on\b/);
});

test('no loader with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).not.toHaveClass(/\bldr-on\b/);
  await expect(page.locator('.ldr')).toBeHidden();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('no loader', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.ldr')).toBeHidden();
  });
});
