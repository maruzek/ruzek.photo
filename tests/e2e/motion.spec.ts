import { test, expect } from './fixtures';

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

test('reloading with the marquee on screen still starts the motion layer', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.locator('.marquee').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForFunction(motionIs, 'on' as const);
  expect(
    await page.locator('.marquee').evaluate((e) => e.getBoundingClientRect().top),
  ).toBeLessThan(page.viewportSize()?.height ?? 0);
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

// day.css reserves the pin's scroll run from the first paint: a deep link below the pin lands on its section and
// nothing shifts when the motion layer pins "same day"
for (const hash of ['#o-mne', '#poptavka']) {
  test(`a deep link to ${hash} lands on it, with no layout shift from the pin`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __shift: number };
      w.__shift = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as Array<PerformanceEntry & { value: number }>)
          w.__shift += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto(`/${hash}`);
    await page.waitForFunction(motionIs, 'on' as const);
    await page.waitForTimeout(800);
    const top = await page.locator(hash).evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(top).toBeLessThan(120);
    expect(await page.evaluate(() => (window as unknown as { __shift: number }).__shift)).toBe(0);
  });
}

// Review Focus 2 and the short-laptop finding: the pin holds the whole section, heading to the step 2 photo, so
// it pins only where all of it fits (day.css, start.ts DAY_PIN); on a shorter screen the section scrolls through
test('"same day" pins only where it fits, with its heading and photo in view', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'the "same day" pin is desktop only');
  for (const [width, height, pins] of [
    [1440, 900, true],
    [1280, 840, true],
    [1280, 640, false],
    [1440, 560, false],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.waitForFunction(motionIs, 'on' as const);
    const pinned = await page.evaluate(() =>
      document.querySelector('.day')?.parentElement?.classList.contains('pin-spacer'),
    );
    expect(pinned, `${width} x ${height}`).toBe(pins);
    if (!pinned) continue;
    // half-way through the pin
    await page.evaluate(() => {
      const spacer = document.querySelector('.day')?.parentElement as HTMLElement;
      window.scrollTo(0, spacer.getBoundingClientRect().top + scrollY + innerHeight * 0.5);
    });
    await expect
      .poll(() => page.locator('.day').evaluate((el) => getComputedStyle(el).position))
      .toBe('fixed');
    const eyebrow = await page.locator('.day .eyebrow').boundingBox();
    expect(eyebrow?.y ?? -1, `${width} x ${height} heading`).toBeGreaterThanOrEqual(0);
    const photo = await page.locator('.day .dph').boundingBox();
    expect(
      (photo?.y ?? 0) + (photo?.height ?? 0),
      `${width} x ${height} photo`,
    ).toBeLessThanOrEqual(height);
  }
});

// Under 900 px the footer name is two lines, first and last name, never broken inside a word ("Rů / žek")
test('the footer name keeps its words whole', async ({ page, viewport }) => {
  test.skip((viewport?.width ?? 0) > 900, 'one line on desktop');
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.locator('.foot .big').scrollIntoViewIfNeeded();
  await expect(page.locator('.foot .big .fb-ch').first()).toBeAttached();
  const lines = await page.locator('.foot .big').evaluate((big) => {
    const rows = new Map<number, string>();
    for (const ch of big.querySelectorAll('.fb-ch')) {
      const y = Math.round(ch.parentElement?.getBoundingClientRect().top ?? 0);
      rows.set(y, (rows.get(y) ?? '') + ch.textContent);
    }
    return [...rows.values()];
  });
  expect(lines).toEqual(['Martin', 'Růžek']);
});

// Each mask (SplitText sets overflow: clip inline) must reach above the ink of its glyph: Ů's ring, i's dot.
// The hero name and the big name in the footer share the 0.84 line height.
for (const [what, selector] of [
  ['the name', '#name'],
  ['the footer name', '.foot .big'],
] as const) {
  test(`${what} mask does not clip accents or dots`, async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(motionIs, 'on' as const);
    await page.evaluate(() => document.fonts.ready);
    await page.locator(selector).scrollIntoViewIfNeeded();
    // wait until the entrance has finished
    await expect
      .poll(() =>
        page
          .locator(`${selector} [style*="clip"] > *`)
          .evaluateAll(
            (els) =>
              els.length > 0 &&
              els.every((el) =>
                /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/.test(getComputedStyle(el).transform),
              ),
          ),
      )
      .toBe(true);
    const clipped = await page.locator(selector).evaluate((host) => {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return ['no canvas'];
      const out: string[] = [];
      const masks = [...host.querySelectorAll<HTMLElement>('[style*="clip"]')];
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
}

// Czech typography: a one-letter preposition or conjunction never ends a line, also after SplitText cut the
// heading into line boxes (its own whitespace reduction used to turn the no-break spaces into plain ones)
test('split headings keep one-letter words with the next word', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('[data-split] .sl').count()).toBeGreaterThan(0);
  const stranded = await page
    .locator('[data-split] .sl')
    .evaluateAll((lines) =>
      lines
        .map((l) => (l.textContent ?? '').trim())
        .filter((t) => /(^|[\s\u00A0])[vszkouaiVSZKOUAI]$/.test(t)),
    );
  expect(stranded).toEqual([]);
});

// The fold number sits in a clipping box and has negative tracking: the last digit must keep its right edge
test('the fold number is not clipped on the right', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.locator('.fold .idx b').evaluateAll((els) =>
    els.map((b) => {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx || !b.textContent) return -1;
      const cs = getComputedStyle(b);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      ctx.letterSpacing = cs.letterSpacing;
      const m = ctx.measureText(b.textContent);
      // ink right edge from the text start, against the box the clip leaves for the text
      const ink = m.actualBoundingBoxRight;
      const box =
        b.parentElement!.getBoundingClientRect().right -
        b.getBoundingClientRect().left -
        parseFloat(cs.paddingLeft);
      return Math.round(ink - box);
    }),
  );
  for (const o of overflow) expect(o).toBeLessThanOrEqual(0);
});

// Fold headings sit at the bottom of a full-screen photo: they must be readable while the fold comes in
test('a fold heading is in view before the whole photo is', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(motionIs, 'on' as const);
  const vh = page.viewportSize()!.height;
  // the second fold with 60 % of its height on screen
  await page.evaluate((vh) => {
    const fold = document.querySelectorAll<HTMLElement>('.fold')[1]!;
    window.scrollTo(0, fold.getBoundingClientRect().top + scrollY - vh * 0.4);
  }, vh);
  const top = await page
    .locator('.fold >> nth=1')
    .locator('h2')
    .evaluate((h) => h.getBoundingClientRect().top);
  expect(top).toBeLessThan(vh);
  await expect(page.locator('.fold >> nth=1').locator('h2 .sl').first()).toHaveCSS(
    'transform',
    /none|matrix\(1, 0, 0, 1, 0, 0\)/,
    { timeout: 4000 },
  );
});
