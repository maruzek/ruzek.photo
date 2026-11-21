import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

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

  // concept §14: touch targets of at least 44 × 44 px; everything inside the viewport, wordmark not on top of the links
  test(`header targets are 44 px and fit the viewport ${path}`, async ({ page }) => {
    await page.goto(path);
    const vw = page.viewportSize()?.width ?? 0;
    const links = page.locator('header a');
    const count = await links.count();
    let seen = 0;
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      if (!(await link.isVisible())) continue;
      seen++;
      const box = await link.boundingBox();
      const name = await link.innerText();
      expect(box?.width, `${name} width`).toBeGreaterThanOrEqual(44);
      expect(box?.height, `${name} height`).toBeGreaterThanOrEqual(44);
      expect(box?.x, `${name} left`).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0), `${name} right`).toBeLessThanOrEqual(vw);
    }
    expect(seen).toBeGreaterThanOrEqual(3); // logo, language switch, inquiry
    const wordmark = page.locator('header .mark b');
    if (await wordmark.isVisible()) {
      const word = await wordmark.boundingBox();
      const firstNav = await page.locator('header nav a:visible').first().boundingBox();
      expect((word?.x ?? 0) + (word?.width ?? 0) + 16).toBeLessThanOrEqual(firstNav?.x ?? 0);
    }
  });

  // E-01: on a short phone the hero grows with its content instead of cutting the captions off
  test(`hero keeps CTAs and captions inside the section on a short phone ${path}`, async ({
    page,
  }) => {
    await page.setViewportSize(path === '/' ? { width: 390, height: 600 } : { width: 360, height: 640 });
    await page.goto(path);
    const hero = await page.locator('.hero').boundingBox();
    expect(hero?.height).toBeGreaterThanOrEqual(600);
    const bottom = (hero?.y ?? 0) + (hero?.height ?? 0);
    for (const sel of ['.hero .cta .btn', '.hero .cta .lnk', '.hero .meta > span:nth-child(1)', '.hero .meta > span:nth-child(2)', '.hero .ph-tag']) {
      const box = await page.locator(sel).boundingBox();
      expect(box, sel).not.toBeNull();
      expect((box?.y ?? 0) + (box?.height ?? 0), `${sel} bottom`).toBeLessThanOrEqual(bottom);
    }
    const clipped = await page.locator('.hero').evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(clipped).toBe(false);
  });

  test(`/en/ shows the translation check marker only in English ${path}`, async ({ page }) => {
    await page.goto(path);
    const marker = page.locator('.translation-todo .todo');
    if (path === '/en/') {
      await expect(marker).toHaveText('TODO: kontrola překladu');
      // Czech text inside the English page is announced in Czech (WCAG 3.1.2)
      await expect(page.locator('.translation-todo')).toHaveAttribute('lang', 'cs');
    } else await expect(marker).toHaveCount(0);
  });
}

test('folds with a placeholder photo carry the placeholder tag clear of the text', async ({ page }) => {
  await page.goto('/');
  const folds = page.locator('.fold');
  expect(await folds.count()).toBe(2);
  for (let i = 0; i < 2; i++) {
    const fold = folds.nth(i);
    const tag = fold.locator('.ph-tag');
    await expect(tag).toHaveText('Zástupná fotka');
    const tagBox = await tag.boundingBox();
    for (const sel of ['h2', '.chips', '.note > p', '.idx']) {
      const box = await fold.locator(sel).boundingBox();
      const apart =
        (tagBox?.y ?? 0) + (tagBox?.height ?? 0) <= (box?.y ?? 0) ||
        (tagBox?.x ?? 0) + (tagBox?.width ?? 0) <= (box?.x ?? 0) ||
        (box?.x ?? 0) + (box?.width ?? 0) <= (tagBox?.x ?? 0);
      expect(apart, `fold ${i} tag overlaps ${sel}`).toBe(true);
    }
  }
});

test('the scroll hint stops after at most two passes (5 s)', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const anim = await page.locator('.scroll-hint').evaluate((el) => {
    const cs = getComputedStyle(el, '::after');
    return { count: cs.animationIterationCount, duration: parseFloat(cs.animationDuration) };
  });
  expect(Number(anim.count)).toBeLessThanOrEqual(2);
  expect(Number(anim.count) * anim.duration).toBeLessThanOrEqual(5);
});

// Keyboard focus ring must have 3:1 against what is really painted behind it, also over a mid-grey photo.
// Reads the rendered pixels: `outline-style` alone says nothing about blending or the backdrop.
function luminance(px: Buffer, o: number): number {
  const lin = (v: number): number => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(px[o] ?? 0) + 0.7152 * lin(px[o + 1] ?? 0) + 0.0722 * lin(px[o + 2] ?? 0);
}

async function focusHomeLink(page: Page): Promise<void> {
  await page.keyboard.press('Tab'); // skip link
  await page.keyboard.press('Tab'); // home link
  await expect(page.locator('header .mark')).toBeFocused();
}

async function focusRingContrast(page: Page): Promise<number> {
  await page.waitForTimeout(100);
  const box = await page.locator('header .mark').boundingBox();
  const x = Math.floor(box?.x ?? 0) - 16;
  const y = Math.round((box?.y ?? 0) + (box?.height ?? 0) / 2);
  const shot = await page.screenshot({ clip: { x, y, width: 16, height: 1 } });
  const { data } = await sharp(shot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data);
  // the ring (2 px wide, 3 px off the box) covers columns 11 and 12; column 0 is the background beyond it
  const ring = Math.max(luminance(px, 11 * 3), luminance(px, 12 * 3));
  const back = luminance(px, 0);
  return (Math.max(ring, back) + 0.05) / (Math.min(ring, back) + 0.05);
}

test('header focus ring is visible over the hero and over a photo fold', async ({ page }) => {
  await page.goto('/');
  await focusHomeLink(page);
  expect(await focusRingContrast(page)).toBeGreaterThanOrEqual(3);
  await page.evaluate(() => window.scrollTo(0, (document.querySelector('#fold-sport') as HTMLElement).offsetTop + 300));
  await page.waitForTimeout(200);
  expect(await focusRingContrast(page)).toBeGreaterThanOrEqual(3);
});

for (const blend of [false, true]) {
  test(`header focus ring is visible over mid-grey${blend ? ' with the blend on' : ''}`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate((withBlend) => {
      // a mid-grey strip behind the header: the worst case for white text and for a blended ring
      document.body.insertAdjacentHTML(
        'beforeend',
        '<div style="position:fixed;inset:0 0 auto;height:120px;background:#808080;z-index:20"></div>',
      );
      if (withBlend) {
        document.documentElement.classList.add('motion-ready');
        document.querySelector('header.top')?.classList.add('blend');
      }
    }, blend);
    await focusHomeLink(page);
    expect(await focusRingContrast(page)).toBeGreaterThanOrEqual(3);
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

test('marquee has a pause button with one constant name, the second copy is hidden', async ({ page }) => {
  await page.goto('/');
  const toggle = page.locator('.marquee-toggle');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveText('Pozastavit');
  await expect(page.locator('.marquee ul').nth(1)).toHaveAttribute('aria-hidden', 'true');
  // the motion layer (task 8) unhides the button and flips aria-pressed: the name must not change with it,
  // or a screen reader says "Spustit, pressed" while the band is stopped
  await toggle.evaluate((el) => {
    el.removeAttribute('hidden');
    el.setAttribute('aria-pressed', 'true');
  });
  await expect(page.getByRole('button', { name: 'Pozastavit', pressed: true })).toBeVisible();
});

for (const path of ['/', '/en/']) {
  test(`marquee without the motion layer shows every item, once, wrapped ${path}`, async ({ page }) => {
    // external scripts fail, the inline script still sets html.motion: the case that clipped the band at 360 px
    await page.route('**/*.js', (r) => r.abort());
    await page.goto(path);
    await expect(page.locator('html')).toHaveClass(/\bmotion\b/);
    await expect(page.locator('html')).not.toHaveClass(/motion-ready/);
    const vw = page.viewportSize()?.width ?? 0;
    const items = page.locator('.marquee ul').first().locator('li');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(8);
    for (let i = 0; i < count; i++) {
      const box = await items.nth(i).boundingBox();
      const label = await items.nth(i).innerText();
      expect(box?.x, `${label} left`).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0) - 32, `${label} right`).toBeLessThanOrEqual(vw);
    }
    await expect(page.locator('.marquee ul[aria-hidden="true"]')).toBeHidden();
    await expect(page.locator('.marquee-toggle')).toBeHidden();
  });
}

test('marquee turns into one moving line with a hidden second copy once the motion layer is up', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.documentElement.classList.add('motion-ready'));
  const copies = page.locator('.marquee ul');
  await expect(copies.nth(1)).toBeVisible();
  await expect(copies.nth(1)).toHaveAttribute('aria-hidden', 'true');
  const ys = await copies.first().locator('li').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().y)));
  expect(new Set(ys).size).toBe(1);
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

// RZ2-11 / E-05: the hero name and the paragraph below must not jump when the web fonts arrive late, and the
// name keeps its line count around the 900 px breakpoint in both languages.
for (const path of ['/', '/en/']) {
  for (const width of [360, 900, 1440]) {
    test(`font swap does not shift the hero name or the paragraph below it ${path} at ${width} px`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'sizes are set per test, one project is enough');
      await page.setViewportSize({ width, height: 800 });
      // the motion layer's hero entrance moves the paragraph on purpose (a transform, no layout shift); this
      // test measures font metrics only
      await page.emulateMedia({ reducedMotion: 'reduce' });
      let release: () => void = () => undefined;
      const gate = new Promise<void>((resolve) => (release = resolve));
      await page.route(/\.woff2(\?|$)/, async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const boxes = () =>
        page.evaluate(() => {
          const rect = (sel: string) => {
            const el = document.querySelector(sel) as HTMLElement;
            const r = el.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height, lh: parseFloat(getComputedStyle(el).lineHeight) };
          };
          return { name: rect('#name'), lead: rect('.hero .row p') };
        });
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => [...document.fonts].some((f) => f.status === 'loaded'))).toBe(false);
      // Which font is the browser really using while the web fonts are pending? The metric-adjusted fallback is
      // `local("Arial")`; a machine without Arial (e.g. this Linux box: DejaVu Sans) falls through to system-ui,
      // whose widths no CSS can match. Then the paragraph may re-wrap, and the allowed shift is exactly that.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument');
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.hero .row p' });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      const adjusted = fonts.some((f) => /arial|helvetica|nimbus sans|liberation sans/i.test(f.familyName));
      if (!adjusted) {
        testInfo.annotations.push({
          type: 'note',
          description: `metric-adjusted fallback not available (${fonts.map((f) => f.familyName).join(', ')}): the shift may be the paragraph's re-wrap, nothing else`,
        });
      }
      const before = await boxes();
      release();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.fonts].some((f) => f.status === 'loaded'));
      await page.waitForTimeout(300);
      const after = await boxes();
      // strict, with every fallback: the name has the same number of lines before and after, 2 up to 900 px
      const lines = (b: { h: number; lh: number }): number => Math.round(b.h / b.lh);
      expect(lines(before.name), 'name lines before').toBe(width <= 900 ? 2 : 1);
      expect(lines(after.name), 'name lines after').toBe(lines(before.name));
      // allowed shift: a few px with the adjusted fallback, otherwise the height change of the paragraph
      const allowed = adjusted ? 6 : Math.abs(after.lead.h - before.lead.h) + 6;
      for (const key of ['name', 'lead'] as const) {
        expect(Math.abs(after[key].y - before[key].y), `${key} y`).toBeLessThanOrEqual(allowed);
        expect(Math.abs(after[key].x - before[key].x), `${key} x`).toBeLessThanOrEqual(6);
      }
      expect(Math.abs(after.name.h - before.name.h), 'name height').toBeLessThanOrEqual(6);
      if (adjusted) expect(Math.abs(after.lead.h - before.lead.h), 'lead height').toBeLessThanOrEqual(6);
    });
  }
}
