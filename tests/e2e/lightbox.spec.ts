import type { Locator } from '@playwright/test';
import { test, expect, skipLoader } from './fixtures';

async function decodedPreview(shot: Locator): Promise<string> {
  const image = shot.locator('img');
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  return image.evaluate(async (img: HTMLImageElement) => {
    await img.decode();
    return img.currentSrc;
  });
}

function pagePosition(photo: Locator) {
  return photo.evaluate((link) => {
    const { left, top } = link.getBoundingClientRect();
    return {
      scrollY,
      width: link.closest('main')?.clientWidth,
      headerWidth: document.querySelector('header.top')?.clientWidth,
      left,
      top,
    };
  });
}

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
  const full = (await shot.getAttribute('href')) ?? 'missing';
  await expect(img).toHaveJSProperty('currentSrc', new URL(full, page.url()).href);
  await expect(img).not.toHaveAttribute('alt', '');
  const caption = page.locator('dialog.lb .lb-cap');
  await expect(caption).toHaveText(/^\d{2} · (Event|Sport|Portrait)( · .+)?$/);
  await expect(caption).not.toContainText('TODO');
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('dialog.lb')).not.toHaveAttribute('open', '');
});

test('a slow full-size image shows its own preview and cannot replace the next photo', async ({
  page,
}) => {
  await page.goto('/');
  const photos = page.locator('[data-lb]');
  await photos.nth(1).scrollIntoViewIfNeeded();
  const preview = await decodedPreview(photos.nth(1));
  const fullB = (await photos.nth(1).getAttribute('href')) ?? 'missing';
  const fullC = (await photos.nth(2).getAttribute('href')) ?? 'missing';
  const gate = Promise.withResolvers<void>();
  await page.route(`**${fullB}`, async (route) => {
    await gate.promise;
    await route.continue();
  });
  try {
    await photos.first().click();
    const image = page.locator('dialog.lb .lb-stage img');
    const fullA = (await photos.first().getAttribute('href')) ?? 'missing';
    await expect(image).toHaveJSProperty('currentSrc', new URL(fullA, page.url()).href);
    await page.keyboard.press('ArrowRight');
    await expect(image).toHaveJSProperty('currentSrc', preview);
    await page.keyboard.press('ArrowRight');
    await expect(image).toHaveJSProperty('currentSrc', new URL(fullC, page.url()).href);

    const lateResponse = page.waitForResponse((response) => response.url().endsWith(fullB));
    gate.resolve();
    const response = await lateResponse;
    await response.finished();
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    await expect(image).toHaveJSProperty('currentSrc', new URL(fullC, page.url()).href);
  } finally {
    gate.resolve();
  }
});

test('a failed full-size image keeps the decoded preview', async ({ page }) => {
  await page.goto('/');
  const photo = page.locator('[data-lb]').first();
  await photo.scrollIntoViewIfNeeded();
  const preview = await decodedPreview(photo);
  const full = (await photo.getAttribute('href')) ?? 'missing';
  await page.route(`**${full}`, (route) => route.abort());

  const failure = page.waitForEvent('requestfailed', (request) => request.url().endsWith(full));
  await photo.click();
  await failure;
  await expect(page.locator('dialog.lb .lb-stage img')).toHaveJSProperty('currentSrc', preview);
});

for (const height of [undefined, 560]) {
  test(`whole portrait and landscape photos fit with stable scroll (${height ?? 'default'} height)`, async ({
    page,
    viewport,
  }) => {
    if (height && viewport) await page.setViewportSize({ width: viewport.width, height });
    await page.goto('/');
    await page.waitForFunction(() => document.documentElement.dataset['motion'] === 'on');
    const dialog = page.locator('dialog.lb');
    const image = dialog.locator('.lb-stage img');
    for (const selector of ['.cs-print.cs-tall', '.cs-print:not(.cs-tall)']) {
      const photo = page.locator(selector).first();
      const full = (await photo.getAttribute('href')) ?? 'missing';
      await photo.focus();
      const before = await pagePosition(photo);
      await page.keyboard.press('Enter');
      await expect(image).toHaveJSProperty('currentSrc', new URL(full, page.url()).href);
      const bounds = await image.evaluate((img: HTMLImageElement) => {
        const modal = img.closest('dialog')!;
        const controls = modal.querySelector('.lb-foot')!.getBoundingClientRect();
        const header = modal.querySelector('.lb-bar')!.getBoundingClientRect();
        const box = img.getBoundingClientRect();
        return {
          fits:
            box.top >= header.bottom &&
            box.bottom <= controls.top &&
            controls.bottom <= innerHeight &&
            box.left >= 0 &&
            box.right <= innerWidth,
          vertical: img.naturalHeight > img.naturalWidth,
          fit: getComputedStyle(img).objectFit,
          overflow: modal.scrollHeight - modal.clientHeight,
        };
      });
      expect(bounds).toEqual({
        fits: true,
        vertical: selector === '.cs-print.cs-tall',
        fit: 'contain',
        overflow: 0,
      });
      expect(await pagePosition(photo)).toEqual(before);
      await page.keyboard.press('Escape');
      await expect(photo).toBeFocused();
      await expect(page.locator('html')).not.toHaveClass(/lb-open/);
      expect(await pagePosition(photo)).toEqual(before);
    }
  });
}

test('the background stays in place with a classic scrollbar', async ({
  playwright,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'classic scrollbar on desktop');
  const browser = await playwright.chromium.launch({
    ...testInfo.project.use.launchOptions,
    ignoreDefaultArgs: ['--hide-scrollbars'],
  });
  try {
    const context = await browser.newContext({
      baseURL: baseURL!,
      viewport: { width: 1440, height: 560 },
    });
    await skipLoader(context);
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForFunction(() => document.documentElement.dataset['motion'] === 'on');
    const hasScrollbar = await page.evaluate(
      () => document.documentElement.clientWidth < innerWidth,
    );
    test.skip(!hasScrollbar, 'browser draws an overlay scrollbar');

    const photo = page.locator('.cs-print.cs-tall').first();
    await photo.focus();
    const before = await pagePosition(photo);
    await page.keyboard.press('Enter');
    await expect(page.locator('dialog.lb .lb-stage img')).toBeVisible();
    expect(await pagePosition(photo)).toEqual(before);
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).not.toHaveClass(/lb-open/);
    await expect(photo).toBeFocused();
    expect(await pagePosition(photo)).toEqual(before);
  } finally {
    await browser.close();
  }
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
