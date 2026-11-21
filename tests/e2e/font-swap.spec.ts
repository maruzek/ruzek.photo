import { expect, test, type Page } from '@playwright/test';

// RZ2-11: when the WOFF2 files arrive late, the browser first shows the fallback faces (size-adjust and metric
// overrides from the Fonts API) and swaps afterwards. The hero name and the paragraph below it must not move.
// RZ2-04: the preloaded faces are the font budget above the fold (concept.md, kap. 13: 70 kB).

/** Largest accepted movement of the hero name or lead after the swap, in CSS px (sub-pixel rounding only). */
const MAX_SHIFT_PX = 2;
/** Budget for the fonts the page preloads (the faces above the fold), bytes. */
const FONT_PRELOAD_BUDGET = 70 * 1024;

// the tests open their own contexts with their own viewports, so one project is enough
test.beforeEach(({ isMobile }) => {
  test.skip(isMobile, 'viewport comes from the test itself');
});

const WIDTHS = [360, 480, 1440] as const;
const PATHS = ['/', '/en/'] as const;

interface Box {
  top: number;
  height: number;
}

async function heroBoxes(page: Page): Promise<{ name: Box; lead: Box }> {
  return page.evaluate(() => {
    const box = (sel: string): Box => {
      const el = document.querySelector(sel);
      if (!el) throw new Error(`missing ${sel}`);
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, height: r.height };
    };
    return { name: box('#name'), lead: box('.hero .row > p') };
  });
}

/**
 * The generated fallback faces use `local(Arial)` (or Arial Bold, Times New Roman, Courier New), which do not
 * exist on every machine (a Linux CI box has none, and Chrome then shows its default sans-serif, which is much
 * wider). To test the metrics the Fonts API computed, point each of those faces at the metric-compatible font
 * installed here, keeping its size-adjust and overrides.
 */
async function useMetricCompatibleFallbacks(page: Page): Promise<void> {
  await page.evaluate(() => {
    const local: Record<string, string> = {
      Arial:
        'local("Arial"), local("Nimbus Sans"), local("Liberation Sans"), local("Arimo"), local("Helvetica")',
      'Arial Bold':
        'local("Arial Bold"), local("Nimbus Sans Bold"), local("Liberation Sans Bold"), local("Arimo Bold")',
      'Times New Roman':
        'local("Times New Roman"), local("Nimbus Roman"), local("Liberation Serif"), local("Tinos")',
      'Courier New':
        'local("Courier New"), local("Nimbus Mono PS"), local("Liberation Mono"), local("Cousine")',
    };
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const family = rule.style.getPropertyValue('font-family');
        const m = /fallback: ([^"]+)"?$/.exec(family);
        const src = m?.[1] ? local[m[1]] : undefined;
        if (src) rule.style.setProperty('src', src);
      }
    }
  });
}

/** Opens the page while every WOFF2 request is held; `release()` lets all of them through. */
async function openWithHeldFonts(
  page: Page,
  path: string,
): Promise<{ release: () => Promise<void> }> {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => (open = resolve));
  await page.route('**/_astro/fonts/*.woff2', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await useMetricCompatibleFallbacks(page);
  return {
    release: async () => {
      open();
      await page.evaluate(() => document.fonts.ready);
      // every face the page uses is loaded, and the swap has been painted
      await page.waitForFunction(() =>
        [...document.fonts].some((f) => f.status === 'loaded' && /Notch/.test(f.family)),
      );
      await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
    },
  };
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
  for (const path of PATHS) {
    for (const width of WIDTHS) {
      test(`hero does not move when late fonts swap in (${path}, ${width} px, motion ${reducedMotion})`, async ({
        browser,
      }) => {
        const context = await browser.newContext({
          viewport: { width, height: 800 },
          reducedMotion,
        });
        const page = await context.newPage();
        const { release } = await openWithHeldFonts(page, path);
        // with motion the layer waits for the fonts for at most ~1.2 s before it starts; hold longer than that
        if (reducedMotion === 'no-preference') await page.waitForTimeout(1500);
        await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
        const before = await heroBoxes(page);
        await release();
        // the motion layer may re-split the name after the swap; give it its frames
        await page.waitForTimeout(300);
        const after = await heroBoxes(page);
        for (const key of ['name', 'lead'] as const) {
          expect(Math.abs(after[key].top - before[key].top), `${key} top`).toBeLessThanOrEqual(
            MAX_SHIFT_PX,
          );
          expect(
            Math.abs(after[key].height - before[key].height),
            `${key} height`,
          ).toBeLessThanOrEqual(MAX_SHIFT_PX);
        }
        await context.close();
      });
    }
  }
}

test('layout shift of the font swap stays within the CLS budget', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 780 },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as Array<{
        value: number;
        hadRecentInput: boolean;
      }>) {
        if (!e.hadRecentInput) w.__cls += e.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const { release } = await openWithHeldFonts(page, '/');
  await page.waitForTimeout(500);
  await release();
  await page.waitForTimeout(500);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThanOrEqual(0.05); // concept.md, kap. 13
  await context.close();
});

test('preloaded fonts (the faces above the fold) fit the 70 kB budget', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const hrefs = await page
    .locator('link[rel="preload"][as="font"]')
    .evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).href));
  // Notch 700 and Text 400, each in latin and latin-ext (Czech diacritics)
  expect(hrefs.length).toBeGreaterThan(0);
  let bytes = 0;
  for (const href of hrefs) bytes += (await (await request.get(href)).body()).length;
  expect(bytes).toBeLessThanOrEqual(FONT_PRELOAD_BUDGET);
});
