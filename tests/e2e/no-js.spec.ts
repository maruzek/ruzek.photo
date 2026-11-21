import { test, expect, type Page } from '@playwright/test';

const ANIMATED = '[data-rise], [data-split], [data-stagger] > *';
const LIMIT_MS = 3500; // the CSS safety net reveals at 3 s after parse; 0.5 s of slack for the server and one frame

interface RevealProbe {
  count: number;
  firstSampleHidden: boolean | null;
  revealedAt: number | null;
}

// The home page only has [data-split] so far. This fixture adds one element of each animated kind to the
// served document, so they exist from the first parse like real content and share one timeline with it.
async function serveWithAnimatedFixture(page: Page): Promise<void> {
  await page.route(
    (url) => url.pathname === '/',
    async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace(
        '</body>',
        '<p data-rise>rise</p><ul data-stagger><li>one</li><li>two</li></ul></body>',
      );
      await route.fulfill({ response, body });
    },
  );
}

// Polls inside the page on every frame, so the clock is performance.now() (from navigation start) and the
// runner's load or round trips cannot move the measurement.
async function probeReveal(page: Page): Promise<void> {
  await page.addInitScript((selector) => {
    const probe: RevealProbe = { count: 0, firstSampleHidden: null, revealedAt: null };
    (window as unknown as { __reveal: RevealProbe }).__reveal = probe;
    let wasHidden = false;
    const tick = (): void => {
      const els = [...document.querySelectorAll(selector)];
      if (els.length > 0) {
        const opacities = els.map((el) => getComputedStyle(el).opacity);
        probe.count = els.length;
        probe.firstSampleHidden ??= opacities.every((o) => o === '0');
        wasHidden ||= opacities.some((o) => o === '0');
        if (wasHidden && opacities.every((o) => o === '1')) {
          probe.revealedAt = performance.now();
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, ANIMATED);
}

for (const cssDelay of [0, 800]) {
  test(`without JS everything starts hidden and is visible within 3.5 s of navigation (stylesheet delayed ${cssDelay} ms)`, async ({
    page,
  }) => {
    await page.route('**/*.js', (r) => r.abort());
    if (cssDelay > 0) {
      await page.route('**/*.css', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, cssDelay));
        await route.continue();
      });
    }
    await serveWithAnimatedFixture(page);
    await probeReveal(page);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('html')).toHaveClass(/\bmotion\b/);
    await page.waitForFunction(
      () => (window as unknown as { __reveal: RevealProbe }).__reveal.revealedAt !== null,
      undefined,
      { timeout: 8000 },
    );
    const probe = await page.evaluate(() => (window as unknown as { __reveal: RevealProbe }).__reveal);
    // data-split (two fold headings) + data-rise + two data-stagger items: all three selectors are covered
    expect(probe.count).toBeGreaterThanOrEqual(5);
    // never painted visible first and then hidden (the flash of a late stylesheet)
    expect(probe.firstSampleHidden).toBe(true);
    expect(probe.revealedAt).toBeLessThanOrEqual(LIMIT_MS);
  });
}

// The page has no [data-stagger] group yet, so the next two tests add one (the CSS rule matches at insertion)
async function addStaggerGroup(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<ul data-stagger><li><a href="#a">first</a></li><li><a href="#b">second</a></li></ul>'
    );
  });
  // right after insertion the first style read can still say 1; wait until the rule has really hidden them
  await expect(page.locator('[data-stagger] > li').first()).toHaveCSS('opacity', '0');
}

test('a focused link inside a stagger group is visible at once', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await addStaggerGroup(page);
  const link = page.locator('[data-stagger] a').first();
  await link.focus();
  await expect(link).toBeFocused();
  // well before the 3 s timer: the group item holding focus is already opaque, the other one is not
  await expect(page.locator('[data-stagger] > li').first()).toHaveCSS('opacity', '1', { timeout: 1000 });
  await expect(page.locator('[data-stagger] > li').nth(1)).toHaveCSS('opacity', '0', { timeout: 500 });
});

test('content revealed by the fallback stays visible after focus leaves it', async ({ page }) => {
  await page.route('**/*.js', (r) => r.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await addStaggerGroup(page);
  const first = page.locator('[data-stagger] > li').first();
  await expect(first).toHaveCSS('opacity', '1', { timeout: 3500 });
  await page.locator('[data-stagger] a').first().focus();
  await page.locator('[data-stagger] a').nth(1).focus();
  await page.waitForTimeout(300);
  await expect(first).toHaveCSS('opacity', '1', { timeout: 100 });
});

test('reduced motion: html.rm and everything visible at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/\brm\b/);
  await expect(page.locator('[data-split]').first()).toHaveCSS('opacity', '1');
});

test('the hidden attribute wins over component display rules', async ({ page }) => {
  await page.goto('/');
  const display = await page.evaluate(() => {
    document.head.insertAdjacentHTML('beforeend', '<style>.probe{display:flex}</style>');
    document.body.insertAdjacentHTML('beforeend', '<div class="probe" hidden></div>');
    return getComputedStyle(document.querySelector('.probe') as Element).display;
  });
  expect(display).toBe('none');
});
