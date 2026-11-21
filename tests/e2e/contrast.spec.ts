import { test, expect, type Page } from './fixtures';
import sharp from 'sharp';

// HM-06 / HM-16 / ST-02: contrast of the text over the photos as rendered, not as assumed by a fixed bottom strip.
// The same region is captured twice, with the text and with the text made transparent (nothing else changes, motion
// is reduced and settled). The pixels that differ are the glyph pixels, antialiased edges included; at each of them
// the background pixel of the second capture becomes a relative luminance (the same model as
// scripts/check-contrast.ts), not blurred, and the WORST one counts: the lightest behind light text, the darkest
// behind dark text. The region is the text's client rects grown by half a line, so accents above a tight line box
// are inside it.
// Headings are large text (WCAG 1.4.3: 3:1), the rest 4.5:1. Both projects (360 × 780 and 1440 × 900), cs and en.

const lin = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (r: number, g: number, b: number): number =>
  0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The text's client rects grown by half a font size and clipped to the viewport, as one region. */
async function textRegion(page: Page, selector: string): Promise<Rect> {
  return page
    .locator(selector)
    .first()
    .evaluate((root) => {
      const pad = parseFloat(getComputedStyle(root).fontSize) / 2;
      let [l, t, r, b] = [Infinity, Infinity, -Infinity, -Infinity];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const q of range.getClientRects()) {
          if (q.width < 1 || q.height < 1) continue;
          l = Math.min(l, q.left);
          t = Math.min(t, q.top);
          r = Math.max(r, q.right);
          b = Math.max(b, q.bottom);
        }
      }
      const x = Math.max(0, Math.floor(l - pad));
      const y = Math.max(0, Math.floor(t - pad));
      const right = Math.min(window.innerWidth, Math.ceil(r + pad));
      const bottom = Math.min(window.innerHeight, Math.ceil(b + pad));
      return { x, y, width: right - x, height: bottom - y };
    });
}

const settle = (page: Page): Promise<void> =>
  page.evaluate(
    () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r()))),
  );

async function raw(
  page: Page,
  clip: Rect,
): Promise<{ data: Buffer; channels: number; pixels: number }> {
  const png = await page.screenshot({ clip, animations: 'disabled' });
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, channels: info.channels, pixels: info.width * info.height };
}

async function worstContrast(
  page: Page,
  selector: string,
): Promise<{ ratio: number; glyphPixels: number }> {
  const el = page.locator(selector).first();
  const ink = await el.evaluate((node) => getComputedStyle(node).color);
  const [r = 0, g = 0, b = 0] = (ink.match(/[\d.]+/g) ?? []).map(Number);
  const inkLum = lum(r, g, b);
  const clip = await textRegion(page, selector);
  if (clip.width < 2 || clip.height < 2) throw new Error(`${selector} has no visible text`);
  await settle(page);
  const shown = await raw(page, clip);
  await page.addStyleTag({
    content: `${selector}, ${selector} * { color: transparent !important; text-decoration-color: transparent !important; }`,
  });
  await settle(page);
  const bg = await raw(page, clip);
  // light text: the lightest background pixel under a glyph is the worst; dark text: the darkest
  const lightInk = inkLum > 0.18;
  let worst = lightInk ? 0 : 1;
  let glyphPixels = 0;
  for (let i = 0; i < bg.pixels; i++) {
    const o = i * bg.channels;
    const differs =
      shown.data[o] !== bg.data[o] ||
      shown.data[o + 1] !== bg.data[o + 1] ||
      shown.data[o + 2] !== bg.data[o + 2];
    if (!differs) continue;
    glyphPixels++;
    const l = lum(bg.data[o] ?? 0, bg.data[o + 1] ?? 0, bg.data[o + 2] ?? 0);
    worst = lightInk ? Math.max(worst, l) : Math.min(worst, l);
  }
  if (glyphPixels === 0) throw new Error(`${selector}: no glyph pixels found`);
  return { ratio: ratio(inkLum, worst), glyphPixels };
}

// `fold-N` is the N-th photographic fold (numbered by the test)
const cases = [
  { name: 'hero name', section: '.hero', text: '.hero #name', min: 3 },
  { name: 'hero label', section: '.hero', text: '.hero .kick', min: 4.5 },
  { name: 'hero lead', section: '.hero', text: '.hero .row p', min: 4.5 },
  { name: 'fold 1 heading', section: 'fold-0', text: 'fold-0 h2', min: 3 },
  { name: 'fold 1 text', section: 'fold-0', text: 'fold-0 .note > p', min: 4.5 },
  { name: 'fold 2 heading', section: 'fold-1', text: 'fold-1 h2', min: 3 },
  { name: 'fold 2 text', section: 'fold-1', text: 'fold-1 .note > p', min: 4.5 },
];

for (const path of ['/', '/en/']) {
  test.describe(`rendered contrast over photos ${path}`, () => {
    for (const c of cases) {
      test(c.name, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready);
        // number the folds so a selector can name one
        await page.evaluate(() =>
          document
            .querySelectorAll('.fold')
            .forEach((f, i) => f.setAttribute('data-test-fold', String(i))),
        );
        const section = c.section.replace(/fold-(\d)/, '[data-test-fold="$1"]');
        const text = c.text.replace(/fold-(\d)/, '[data-test-fold="$1"]');
        await page.locator(section).evaluate((s) => s.scrollIntoView({ block: 'start' }));
        await page
          .locator(`${section} img`)
          .first()
          .evaluate((img: HTMLImageElement) =>
            img.complete
              ? undefined
              : new Promise((r) => img.addEventListener('load', r, { once: true })),
          );
        // a fold taller than the viewport: bring the text itself into view as well
        await page.locator(text).first().scrollIntoViewIfNeeded();
        const { ratio: value, glyphPixels } = await worstContrast(page, text);
        console.log(`${path} ${c.name}: ${value.toFixed(2)}:1 over ${glyphPixels} glyph pixels`);
        expect(value).toBeGreaterThanOrEqual(c.min);
      });
    }
  });
}
