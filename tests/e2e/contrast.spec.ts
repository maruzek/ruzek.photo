import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

// HM-06: contrast of the text over the photos as rendered on a phone (360 × 780), not as assumed by a fixed
// bottom strip. The text is made transparent, the area under each text element is captured, its pixels are
// turned into relative luminance and averaged (the same model as scripts/check-contrast.ts), and the result is
// compared with the element's own text colour. Headings are large text (WCAG 1.4.3: 3:1), paragraphs 4.5:1.

const lin = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (r: number, g: number, b: number): number =>
  0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

async function contrastUnder(page: Page, selector: string): Promise<number> {
  const el = page.locator(selector).first();
  const ink = await el.evaluate((node) => getComputedStyle(node).color);
  const [r = 0, g = 0, b = 0] = (ink.match(/[\d.]+/g) ?? []).map(Number);
  await page.addStyleTag({
    content: `${selector}, ${selector} * { color: transparent !important; text-decoration-color: transparent !important; }`,
  });
  const box = await el.boundingBox();
  if (!box) throw new Error(`${selector} has no box`);
  const png = await page.screenshot({ clip: box, animations: 'disabled' });
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  const n = info.width * info.height;
  for (let i = 0; i < n; i++) {
    const o = i * info.channels;
    sum += lum(data[o] ?? 0, data[o + 1] ?? 0, data[o + 2] ?? 0);
  }
  return ratio(lum(r, g, b), sum / n);
}

test.describe('rendered contrast over photos at 360 × 780', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile crop only');
  test.use({ viewport: { width: 360, height: 780 } });

  // `fold-N` is the N-th photographic fold (numbered by the test)
  const cases = [
    { name: 'hero name', section: '.hero', text: '.hero #name', min: 3 },
    { name: 'hero lead', section: '.hero', text: '.hero .row p', min: 4.5 },
    { name: 'fold 1 heading', section: 'fold-0', text: 'fold-0 h2', min: 3 },
    { name: 'fold 1 text', section: 'fold-0', text: 'fold-0 .note > p', min: 4.5 },
    { name: 'fold 2 heading', section: 'fold-1', text: 'fold-1 h2', min: 3 },
    { name: 'fold 2 text', section: 'fold-1', text: 'fold-1 .note > p', min: 4.5 },
  ];

  for (const c of cases) {
    test(c.name, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
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
      const value = await contrastUnder(page, text);
      console.log(`${c.name}: ${value.toFixed(2)}:1`);
      expect(value).toBeGreaterThanOrEqual(c.min);
    });
  }
});
