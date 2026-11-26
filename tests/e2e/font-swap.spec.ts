import { expect, skipLoader, test, type Page } from './fixtures';

// RZ2-11: when the WOFF2 files arrive late, the browser first shows the fallback faces (size-adjust and metric
// overrides from the Fonts API) and swaps afterwards. The hero name and the paragraph below it must not move.
// RZ2-04: the font files the first mobile viewport really uses are the font budget above the fold (concept.md,
// kap. 13: 70 kB).

/** Largest accepted movement of the hero name or lead after the swap, in CSS px (sub-pixel rounding only). */
const MAX_SHIFT_PX = 2;
/** Budget for the font files used above the fold on a phone (concept.md, kap. 13: 2 × WOFF2, 70 kB), bytes. */
const FONT_ABOVE_FOLD_BUDGET = 70 * 1024;

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
  /** false keeps the production @font-face rules untouched (the fallback is then whatever this machine has) */
  metricFallbacks = true,
): Promise<{ release: () => Promise<void> }> {
  let open!: () => void;
  const gate = new Promise<void>((resolve) => (open = resolve));
  await page.route('**/_astro/fonts/*.woff2', async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  if (metricFallbacks) await useMetricCompatibleFallbacks(page);
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
        await skipLoader(context);
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

/**
 * PF-08: the tests above point the fallback faces at a metric-compatible font, which a machine without Arial
 * (most Android phones) does not have. This one leaves the production @font-face rules as they are, so the
 * fallback is what this machine really picks when `local("Arial")` is missing.
 */
test('hero shift with the production fallback faces untouched (360 px)', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    reducedMotion: 'reduce',
  });
  await skipLoader(context);
  const page = await context.newPage();
  const { release } = await openWithHeldFonts(page, '/', false);
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
  const textWidth = (): Promise<number> =>
    page.evaluate(() => {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('.hero .row > p') as Element);
      return range.getBoundingClientRect().width;
    });
  const before = await heroBoxes(page);
  const widthBefore = await textWidth();
  await release();
  await page.waitForTimeout(300);
  const after = await heroBoxes(page);
  // proof that a swap really happened: the glyphs of the lead changed width
  expect(Math.abs((await textWidth()) - widthBefore), 'lead text width changed').toBeGreaterThan(1);
  const shift = {
    nameTop: Math.abs(after.name.top - before.name.top),
    nameHeight: Math.abs(after.name.height - before.name.height),
    leadTop: Math.abs(after.lead.top - before.lead.top),
    leadHeight: Math.abs(after.lead.height - before.lead.height),
  };
  console.log('untouched fallback shift (px):', JSON.stringify(shift));
  for (const [key, value] of Object.entries(shift)) {
    expect(value, key).toBeLessThanOrEqual(MAX_SHIFT_PX);
  }
  await context.close();
});

test('layout shift of the font swap stays within the CLS budget', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 360, height: 780 },
    reducedMotion: 'reduce',
  });
  await skipLoader(context);
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

/**
 * The font files the first mobile viewport really uses, whether they were preloaded or found through the CSS. For
 * every visible text node (inside the viewport, not scrolled) each character is matched against the page's
 * @font-face rules (family, weight, style, unicode-range), and the unique files are collected.
 */
async function fontFilesAboveTheFold(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    interface Face {
      family: string;
      lo: number;
      hi: number;
      style: string;
      ranges: Array<[number, number]>;
      url: string;
    }
    const faces: Face[] = [];
    const unq = (v: string): string => v.trim().replace(/^["']|["']$/g, '');
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const url = /url\(["']?([^"')]+\.woff2)["']?\)/.exec(
          rule.style.getPropertyValue('src'),
        )?.[1];
        if (!url) continue; // generated local() fallback faces
        const weights = rule.style.getPropertyValue('font-weight').trim().split(/\s+/).map(Number);
        const range = rule.style.getPropertyValue('unicode-range');
        const ranges: Array<[number, number]> = range
          ? range.split(',').map((part) => {
              const [a = '0', b] = part.trim().replace(/^U\+/i, '').split('-');
              return [
                parseInt(a.replace(/\?/g, '0'), 16),
                parseInt((b ?? a).replace(/\?/g, 'F'), 16),
              ];
            })
          : [[0, 0x10ffff]];
        faces.push({
          family: unq(rule.style.getPropertyValue('font-family')),
          lo: weights[0] ?? 400,
          hi: weights[1] ?? weights[0] ?? 400,
          style: rule.style.getPropertyValue('font-style').trim() || 'normal',
          ranges,
          url: new URL(url, document.baseURI).pathname,
        });
      }
    }
    const used = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      const el = node.parentElement;
      if (!el || !text.trim()) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter(
        (r) => r.width > 0 && r.height > 0 && r.top < innerHeight && r.bottom > 0,
      );
      if (rects.length === 0) continue;
      const families = cs.fontFamily.split(',').map(unq);
      const weight = Number(cs.fontWeight);
      const style = cs.fontStyle === 'oblique' ? 'italic' : cs.fontStyle;
      const shown = cs.textTransform === 'uppercase' ? text.toUpperCase() : text;
      for (const ch of shown) {
        const code = ch.codePointAt(0) ?? 0;
        if (/\s/.test(ch)) continue;
        for (const family of families) {
          const face = faces.find(
            (f) =>
              f.family === family &&
              f.style === style &&
              weight >= f.lo &&
              weight <= f.hi &&
              f.ranges.some(([a, b]) => code >= a && code <= b),
          );
          if (face) {
            used.add(face.url);
            break;
          }
          // a declared family without a face for this character: the browser falls to the next family
        }
      }
    }
    return [...used].sort();
  });
}

for (const path of PATHS) {
  test(`font files used above the fold on a phone fit the 70 kB budget (${path})`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 360, height: 780 },
      reducedMotion: 'reduce',
    });
    await skipLoader(context);
    const page = await context.newPage();
    await page.goto(path, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const files = await fontFilesAboveTheFold(page);
    // Cross-check that the browser downloaded every file the visible text uses.
    const downloaded = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .map((e) => new URL(e.name).pathname)
        .filter((n) => n.endsWith('.woff2')),
    );
    expect(files.length).toBeGreaterThan(0);
    expect(downloaded).toEqual(expect.arrayContaining(files));
    const sizes = await Promise.all(files.map(async (file) => (await (await page.request.get(file)).body()).length));
    const bytes = sizes.reduce((total, size) => total + size, 0);
    console.log(`fonts above the fold: ${files.length} files, ${(bytes / 1024).toFixed(1)} KiB`);
    expect(bytes, `${files.length} font files`).toBeLessThanOrEqual(FONT_ABOVE_FOLD_BUDGET);
    await context.close();
  });
}

test('additional Latin and Latin Extended glyphs still use Stack Sans Text', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const sample = document.createElement('span');
    sample.id = 'font-coverage-sample';
    sample.textContent = 'ÅŁ';
    document.body.insertBefore(sample, document.body.firstChild);
    const [family] = getComputedStyle(sample).fontFamily.split(',');
    await document.fonts.load(`400 16px ${family}`, sample.textContent);
  });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '#font-coverage-sample',
  });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts.reduce((total, font) => total + font.glyphCount, 0)).toBe(2);
  for (const font of fonts) {
    expect(font).toMatchObject({ familyName: expect.stringMatching(/^Stack Sans Text\b/), isCustomFont: true });
  }
});
