import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

// HM-06 / HM-16: contrast of the text over the photos as rendered, not as assumed by a fixed bottom strip.
// The text is made transparent and the area under each line of text (the client rects of its text nodes, not the
// element box with its padding) is captured. Every pixel becomes a relative luminance (the same model as
// scripts/check-contrast.ts) and the WORST pixel counts: the lightest one behind light text, the darkest one
// behind dark text. An average hid light spots under single glyphs (7.46:1 average vs 3.58:1 under the hero
// label). A 1 px blur first removes single-pixel JPEG noise; a glyph stroke is wider than that.
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

/** Client rects of all visible text in the element, clipped to the viewport (page coordinates for screenshot). */
async function textRects(page: Page, selector: string): Promise<Rect[]> {
  return page
    .locator(selector)
    .first()
    .evaluate((root) => {
      const out: { x: number; y: number; width: number; height: number }[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of range.getClientRects()) {
          const x = Math.max(0, Math.floor(r.left));
          const y = Math.max(0, Math.floor(r.top));
          const right = Math.min(vw, Math.ceil(r.right));
          const bottom = Math.min(vh, Math.ceil(r.bottom));
          if (right - x >= 2 && bottom - y >= 2)
            out.push({ x, y, width: right - x, height: bottom - y });
        }
      }
      return out;
    });
}

async function worstContrast(page: Page, selector: string): Promise<number> {
  const el = page.locator(selector).first();
  const ink = await el.evaluate((node) => getComputedStyle(node).color);
  const [r = 0, g = 0, b = 0] = (ink.match(/[\d.]+/g) ?? []).map(Number);
  const inkLum = lum(r, g, b);
  const rects = await textRects(page, selector);
  if (rects.length === 0) throw new Error(`${selector} has no visible text`);
  await page.addStyleTag({
    content: `${selector}, ${selector} * { color: transparent !important; text-decoration-color: transparent !important; }`,
  });
  // light text: the lightest background pixel is the worst; dark text: the darkest
  const lightInk = inkLum > 0.18;
  let worst = lightInk ? 0 : 1;
  for (const clip of rects) {
    const png = await page.screenshot({ clip, animations: 'disabled' });
    const { data, info } = await sharp(png)
      .removeAlpha()
      .blur(1)
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 0; i < info.width * info.height; i++) {
      const o = i * info.channels;
      const l = lum(data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0);
      worst = lightInk ? Math.max(worst, l) : Math.min(worst, l);
    }
  }
  return ratio(inkLum, worst);
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
        const value = await worstContrast(page, text);
        console.log(`${path} ${c.name}: ${value.toFixed(2)}:1`);
        expect(value).toBeGreaterThanOrEqual(c.min);
      });
    }
  });
}
