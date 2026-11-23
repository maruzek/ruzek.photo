import { test, expect } from './fixtures';
import { PLACEMENT } from '../../src/config/placement';

// State of the ASCII hero is on the hero element: data-ascii-intro (running | done | skipped | lite) and
// data-ascii-lens (off | tracking | drift | idle). No global in the production build the suite tests.

// The plan asked for "LCP element is IMG". Chrome does not report the placeholder hero photo as an LCP
// candidate at all, not even with reduced motion where no canvas effect runs, so the test checks what this code
// controls: the photo is requested first and is loaded and visible under the ASCII canvas by the load event.
test('the hero photo loads first and is not held back by the ASCII canvas', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const img = page.locator('.hero .media img');
  await expect(img).toHaveAttribute('fetchpriority', 'high');
  await expect(img).toHaveAttribute('loading', 'eager');
  expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(
    true,
  );
  await expect(img).toBeVisible();
});

test('the hero ASCII canvas samples the same horizontal crop as the photo', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = new Proxy(draw, {
      apply(target, receiver: CanvasRenderingContext2D, args: unknown[]) {
        // the sampler draws a small copy of the photo (an ImageBitmap), so the crop is compared as a fraction
        const [source, cropX] = args;
        const width =
          source instanceof ImageBitmap
            ? source.width
            : source instanceof HTMLImageElement && source.closest('.hero')
              ? source.naturalWidth
              : 0;
        const photo = document.querySelector<HTMLImageElement>('.hero .media img');
        if (args.length === 9 && width && photo)
          photo.dataset['sampledCropX'] = String((Number(cropX) / width) * photo.naturalWidth);
        Reflect.apply(target, receiver, args);
      },
    });
  });
  await page.goto('/');
  const photo = page.locator('.hero .media img');
  await expect(photo).toHaveAttribute('data-sampled-crop-x', /\d/);
  const { sampled, rendered, faceInCrop } = await photo.evaluate((img: HTMLImageElement) => {
    const { width, height } = img.getBoundingClientRect();
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const position = parseFloat(getComputedStyle(img).objectPosition) / 100;
    return {
      sampled: Number(img.dataset['sampledCropX']),
      rendered: (img.naturalWidth - width / scale) * position,
      faceInCrop: ((img.naturalWidth * 0.69 - Number(img.dataset['sampledCropX'])) * scale) / width,
    };
  });
  expect(sampled).toBeCloseTo(rendered, 0); // within half a photo pixel: the small copy rounds its own size
  if (testInfo.project.name === 'mobile-360') {
    expect(faceInCrop).toBeGreaterThan(0.68);
    expect(faceInCrop).toBeLessThan(0.88);
  }
});

test('mobile crops show the dancer beside the title and centre the speaker, with the desktop crop unchanged', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const mobile = testInfo.project.name === 'mobile-360';
  await page.goto('/');
  for (const width of mobile ? [360, 390] : [1440]) {
    await page.setViewportSize({ width, height: mobile ? 780 : 900 });
    // The approximate horizontal centre of each face, measured on the source photos.
    for (const [selector, face, min, max] of [
      ['.hero .media img', 0.69, 0.68, 0.88],
      ['.fold img', 0.38, 0.32, 0.68],
    ] as const) {
      const photo = page.locator(selector).first();
      await photo.scrollIntoViewIfNeeded();
      await expect
        .poll(() => photo.evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
      const { position, faceInCrop } = await photo.evaluate((img: HTMLImageElement, faceX) => {
        const { width, height } = img.getBoundingClientRect();
        const coverWidth = Math.max(width, (height * img.naturalWidth) / img.naturalHeight);
        const position = parseFloat(getComputedStyle(img).objectPosition) / 100;
        return {
          position,
          faceInCrop: (coverWidth * faceX - (coverWidth - width) * position) / width,
        };
      }, face);
      if (mobile) {
        expect(faceInCrop).toBeGreaterThan(min);
        expect(faceInCrop).toBeLessThan(max);
      } else {
        expect(position).toBe(0.5);
      }
    }
  }
});

test('reduced motion: dither and ASCII canvases hidden, wipes painted statically', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const cv of await page.locator('canvas.dz, canvas.ascii').all())
    await expect(cv).toBeHidden();
  const wipes = page.locator('canvas.dwipe');
  expect(await wipes.count()).toBeGreaterThan(0);
  for (const cv of await wipes.all()) await expect(cv).toHaveAttribute('data-painted', 'static');
  // the destination colour grows from the bottom edge, where the next zone starts: the bottom row is all `to`,
  // the top row at most half (one Bayer row), so neither edge of the band is a hard line
  const rows = await wipes.first().evaluate((cv: HTMLCanvasElement) => {
    const ctx = cv.getContext('2d');
    const to = cv.dataset['to'] ?? '';
    const isTo = (row: number): number => {
      const { data } = ctx?.getImageData(0, row, cv.width, 1) ?? { data: new Uint8ClampedArray() };
      let n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const hex = [data[i], data[i + 1], data[i + 2]]
          .map((v) => (v ?? 0).toString(16).padStart(2, '0'))
          .join('');
        if (`#${hex}` === to.toLowerCase()) n++;
      }
      return n / cv.width;
    };
    return { top: isTo(0), bottom: isTo(cv.height - 1) };
  });
  expect(rows.bottom).toBe(1);
  expect(rows.top).toBeLessThanOrEqual(0.5);
  await expect(page.locator('.hero')).not.toHaveAttribute('data-ascii-intro', /.+/);
});

test('a repeat visit with the photo in cache skips the intro', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.goto('/');
  await expect(page.locator('.hero')).toHaveAttribute('data-ascii-intro', 'skipped');
});

test('motion: dither canvases draw while in view', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset['motion'] === 'on');
  await page.evaluate(() => document.querySelector('.fold')?.scrollIntoView({ block: 'start' }));
  await expect(page.locator('.fold canvas.dz').first()).toHaveAttribute('data-painted', 'live');
  await page.evaluate(() =>
    document.querySelector('canvas.dwipe')?.scrollIntoView({ block: 'center' }),
  );
  await expect(page.locator('canvas.dwipe').first()).toHaveAttribute('data-painted', 'live');
});

test('the final transition finishes at the end of a tall desktop page', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the short footer leaves the trigger out of reach on tall desktop viewports');
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto('/');
  await page.waitForFunction(() => document.documentElement.dataset['motion'] === 'on');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const wipe = page.locator('canvas.dwipe').last();
  await expect(wipe).toHaveAttribute('data-painted', 'live');
  await expect
    .poll(() =>
      wipe.evaluate((canvas: HTMLCanvasElement) => {
        const pixels = canvas
          .getContext('2d')!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < pixels.length; i += 4) {
          if (
            pixels[i] !== 7 ||
            pixels[i + 1] !== 8 ||
            pixels[i + 2] !== 11 ||
            pixels[i + 3] !== 255
          )
            return false;
        }
        return true;
      }),
    )
    .toBe(true);
});

test('on touch the lens drifts for 5 s and then stops', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-360', 'touch only');
  await page.goto('/');
  const hero = page.locator('.hero');
  await expect(hero).toHaveAttribute('data-ascii-lens', 'drift');
  await expect(hero).toHaveAttribute('data-ascii-lens', 'idle', { timeout: 8000 });
});

// HM-03: a page the 3 s fallback already revealed never gets the photo covered again
test('the intro is skipped once the fallback has revealed the page', async ({ page }) => {
  await page.route(new RegExp(`${PLACEMENT.hero}\\.[^/]*\\.(avif|webp|jpg)$`), async (route) => {
    await new Promise((r) => setTimeout(r, 3600));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/reveal-fallback/, { timeout: 5000 });
  await expect(page.locator('.hero')).toHaveAttribute('data-ascii-intro', 'skipped', {
    timeout: 8000,
  });
});

// HM-11: `lite` (here: little device memory) has no pointer lens
test('quality lite never turns the lens on', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'pointer lens is desktop only');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 });
  });
  await page.goto('/');
  const hero = page.locator('.hero');
  await expect(hero).toHaveAttribute('data-ascii-lens', 'off');
  await page.mouse.move(400, 400);
  await page.mouse.move(600, 450, { steps: 5 });
  await page.waitForTimeout(300);
  await expect(hero).toHaveAttribute('data-ascii-lens', 'off');
});
