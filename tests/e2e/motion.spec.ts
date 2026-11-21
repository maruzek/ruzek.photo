import { test, expect } from '@playwright/test';

// The motion layer reports its state on <html data-motion="on|off"> (no global in the production build, which
// is what the e2e suite tests).
// A function, not a string: the CSP has no 'unsafe-eval', and Playwright evaluates a string predicate with eval.
// The state is passed as the argument (a function is serialized without its closure).
const motionIs = (state: 'on' | 'off'): boolean =>
  document.documentElement.dataset['motion'] === state;

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
  await page.waitForFunction(motionIs, 'on' as const);
  await expect(page.locator('html')).toHaveClass(/\bmotion-ready\b/);
  await expect(page.locator('html')).toHaveClass(/\blenis\b/);
});

test('switching to reduced motion at runtime settles the page', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(motionIs, 'off' as const);
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
  await page.waitForFunction(motionIs, 'on' as const, { timeout: 15_000 });
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
  await page.waitForFunction(motionIs, 'on' as const);
  await page.locator('[data-lb]').first().click();
  await expect(page.locator('dialog.lb')).toHaveAttribute('open', '');
  // measure only once the page has stopped moving (the hash jump and Lenis may still be settling)
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const a = scrollY;
        setTimeout(() => resolve(scrollY === a), 250);
      }),
  );
  const y = await page.evaluate(() => scrollY);
  const dialog = page.locator('dialog.lb');
  // HM-13: Space on the focused Close button would just close the dialog; move focus off any control first
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.wheel(0, 800);
  await expect(dialog).toHaveAttribute('open', '');
  for (const key of ['Space', 'ArrowDown', 'PageDown']) {
    await page.keyboard.press(key);
    await expect(dialog).toHaveAttribute('open', '');
  }
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
  await page.waitForFunction(motionIs, 'on' as const);
  await page.getByRole('link', { name: /Služby a ceny/ }).click();
  await expect(page.locator('#sluzby')).toBeFocused();
  // HM-09: the section starts below the fixed header, not under it
  const { top, header } = await page.evaluate(() => ({
    top: document.querySelector('#sluzby')!.getBoundingClientRect().top,
    header: document.querySelector<HTMLElement>('header.top')!.offsetHeight,
  }));
  expect(top).toBeGreaterThanOrEqual(header - 1);
});

test('reduced motion: an anchor jump lands below the header', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) <= 900, 'the services link is in the desktop navigation only');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('link', { name: /Služby a ceny/ }).click();
  const { top, header } = await page.evaluate(() => ({
    top: document.querySelector('#sluzby')!.getBoundingClientRect().top,
    header: document.querySelector<HTMLElement>('header.top')!.offsetHeight,
  }));
  expect(top).toBeGreaterThanOrEqual(header - 1);
});

// HM-09: a control focused before its group has risen in is shown at once
test('focusing the hero CTA during its entrance shows it at once', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.locator('.hero .cta a').first().focus();
  await expect(page.locator('.hero .row > .cta')).toHaveCSS('opacity', '1', { timeout: 200 });
});

test('marquee can be paused', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
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
  await page.waitForFunction(motionIs, 'on' as const);
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

// HM-02: a failure inside start() (not just a failed import) undoes what was set up and shows everything
test('a failure in the middle of the motion layer reveals the page', async ({ page }) => {
  await page.addInitScript(() => {
    window.IntersectionObserver = class {
      constructor() {
        throw new Error('IntersectionObserver unavailable');
      }
    } as unknown as typeof IntersectionObserver;
  });
  await page.goto('/');
  await page.waitForFunction(motionIs, 'off' as const);
  await expect(page.locator('html')).not.toHaveClass(/\blenis\b/);
  await expect(page.locator('html')).not.toHaveClass(/motion-ready/);
  for (const el of await page.locator('.svc-sec [data-stagger] > *, [data-rise]').all())
    await expect(el).toHaveCSS('opacity', '1');
  expect(await page.locator('[data-split] [class*="mask"]').count()).toBe(0);
});

// HM-04: reduced motion chosen while start() waits for the fonts never starts Lenis
test('switching to reduced motion during the font wait starts nothing', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __lenisSeen: boolean; __raf: number };
    w.__lenisSeen = false;
    w.__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      w.__raf++;
      return raf(cb);
    };
    // added and removed in the same task would leave no trace in classList: read the old values too
    // (init scripts run before <html> exists, so watch the document)
    new MutationObserver((records) => {
      for (const r of records)
        if (/\blenis\b/.test(`${r.oldValue ?? ''} ${document.documentElement.className}`))
          w.__lenisSeen = true;
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
      attributeOldValue: true,
    });
  });
  await page.route(/\.woff2$/, async (route) => {
    await new Promise((r) => setTimeout(r, 2500));
    await route.continue();
  });
  const startChunk = page.waitForResponse((r) => /start[^/]*\.js$/.test(r.url()));
  await page.goto('/', { waitUntil: 'commit' });
  await startChunk;
  await page.waitForTimeout(200); // start() is now waiting for the delayed fonts
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(motionIs, 'off' as const, { timeout: 10_000 });
  await page.waitForTimeout(1500); // past FONT_WAIT_MS
  expect(
    await page.evaluate(() => (window as unknown as { __lenisSeen: boolean }).__lenisSeen),
  ).toBe(false);
  await expect(page.locator('html')).not.toHaveClass(/motion-ready/);
  // registering ScrollTrigger would start its frame loop even without any trigger
  const a = await page.evaluate(() => (window as unknown as { __raf: number }).__raf);
  await page.waitForTimeout(1000);
  const b = await page.evaluate(() => (window as unknown as { __raf: number }).__raf);
  expect(b - a).toBeLessThan(5);
});

// HM-04: after switching to reduced motion no frame loop keeps running
test('switching to reduced motion stops every frame loop', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __raf: number };
    w.__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      w.__raf++;
      return raf(cb);
    };
  });
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(motionIs, 'off' as const);
  await page.waitForTimeout(500);
  const a = await page.evaluate(() => (window as unknown as { __raf: number }).__raf);
  await page.waitForTimeout(1000);
  const b = await page.evaluate(() => (window as unknown as { __raf: number }).__raf);
  expect(b - a).toBeLessThan(5);
});

// HM-05: steps that are not reached yet keep full text contrast; the marker and the line show progress
test('pinned same-day steps keep full contrast before they light up', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.evaluate(() => {
    const day = document.querySelector('.day') as HTMLElement;
    window.scrollTo(0, day.getBoundingClientRect().top + scrollY + 10);
  });
  await expect(page.locator('.step:not(.is-on)').first()).toBeAttached();
  for (const step of await page.locator('.step').all())
    await expect(step).toHaveCSS('opacity', '1');
});

// HM-08: a scroll key during wheel inertia wins over the rest of the smooth scroll
test('a scroll key during wheel inertia is not overridden by Lenis', async ({ page, isMobile }) => {
  test.skip(isMobile, 'wheel smoothing is desktop only');
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.evaluate(() => window.scrollTo(0, 3000));
  await page.waitForTimeout(300);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 1500);
  await page.waitForTimeout(120);
  await page.keyboard.press('Home');
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => scrollY)).toBeLessThan(50);
});

// HM-10: a narrow photo between the sample points still turns the blend off (the "same day" portrait)
test('header does not blend over a narrow photo', async ({ page, viewport }) => {
  test.skip(
    (viewport?.width ?? 0) < 1200,
    'the portrait sits between sample points at desktop width',
  );
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  const header = page.locator('header.top');
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => {
      const ph = document.querySelector('.day .dph') as HTMLElement;
      const h = document.querySelector<HTMLElement>('header.top')!.offsetHeight;
      window.scrollTo(0, scrollY + ph.getBoundingClientRect().top - h / 2);
    });
    await page.waitForTimeout(250);
  }
  const overlaps = await page.evaluate(() => {
    const r = document.querySelector('.day .dph')!.getBoundingClientRect();
    const h = document.querySelector<HTMLElement>('header.top')!.offsetHeight;
    return r.top < h && r.bottom > 0;
  });
  expect(overlaps).toBe(true);
  await expect(header).not.toHaveClass(/\bblend\b/);
});

// Review Focus 1: triggers below the pinned "same day" section must include the pin's spacing
test('after a jump from the menu, the About section is fully shown (desktop pin)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'the "same day" pin is desktop only');
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: /^O\smně$/ })
    .click(); // the label has a nbsp
  await expect(page.locator('#o-mne')).toBeFocused({ timeout: 4000 }); // Lenis has landed
  // every paragraph already past its trigger line (top 88 %, measured without the 32 px start offset) is shown;
  // one lower down rises in on the next scroll
  const rise = page.locator('.about [data-rise]');
  const passed = await rise.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().top - 32 < innerHeight * 0.85),
  );
  expect(passed.filter(Boolean).length).toBeGreaterThanOrEqual(2);
  for (const [i, inView] of passed.entries())
    if (inView) await expect(rise.nth(i)).toHaveCSS('opacity', '1');
  await page.mouse.wheel(0, 400);
  for (const p of await rise.all()) await expect(p).toHaveCSS('opacity', '1', { timeout: 4000 });
  // the portrait's dither canvas is fully transparent once the photo has assembled
  await expect
    .poll(
      () =>
        page.locator('.about canvas.dz').evaluate((cv: HTMLCanvasElement) => {
          const ctx = cv.getContext('2d');
          if (!ctx || cv.dataset['painted'] !== 'live') return -1;
          const { data } = ctx.getImageData(0, 0, cv.width, cv.height);
          let opaque = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i] !== 0) opaque++;
          return opaque;
        }),
      { timeout: 4000 },
    )
    .toBe(0);
});

// Each mask (SplitText sets overflow: clip inline) must reach above the ink of its glyph: Ů's ring, i's dot
test('the name mask does not clip accents or dots', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.evaluate(() => document.fonts.ready);
  // wait until the entrance has finished
  await expect
    .poll(() =>
      page
        .locator('#name [style*="clip"] > *')
        .evaluateAll((els) =>
          els.every((el) =>
            /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(getComputedStyle(el).transform),
          ),
        ),
    )
    .toBe(true);
  const clipped = await page.locator('#name').evaluate((h1) => {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return ['no canvas'];
    const out: string[] = [];
    const masks = [...h1.querySelectorAll<HTMLElement>('[style*="clip"]')];
    if (masks.length === 0) return ['no masks'];
    for (const mask of masks) {
      const ch = mask.firstElementChild as HTMLElement | null;
      if (!ch?.textContent?.trim()) continue;
      const cs = getComputedStyle(ch);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = ctx.measureText(ch.textContent);
      const lh = parseFloat(cs.lineHeight);
      const a = m.fontBoundingBoxAscent;
      const d = m.fontBoundingBoxDescent;
      const baseline = ch.getBoundingClientRect().top + (lh - (a + d)) / 2 + a;
      const inkTop = baseline - m.actualBoundingBoxAscent;
      if (mask.getBoundingClientRect().top > inkTop + 0.5) out.push(ch.textContent);
    }
    return out;
  });
  expect(clipped).toEqual([]);
});
