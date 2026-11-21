import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';
import { ANONYMIZE_AFTER_DAYS, PRIVACY_NOTICE_VERSION } from '../../src/config/privacy';
import { SITE_URL } from '../../src/config/site';
import { PLACEMENT } from '../../src/config/placement';
import { ogSize } from '../../src/lib/seo/og';

// Task 13: canonical, hreflang, Open Graph, sitemap, 404 and the privacy page.

test.describe('head and sitemap', () => {
  test.skip(({ isMobile }) => isMobile, 'markup, one project is enough');

  for (const [path, locale] of [
    ['/', 'cs'],
    ['/en/', 'en'],
  ] as const) {
    test(`${path} has canonical, hreflang and an og:image of the size its meta tags state`, async ({ page, request }) => {
      await page.goto(path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `${SITE_URL}${path}`,
      );
      await expect(page.locator('link[rel="alternate"][hreflang="cs"]')).toHaveAttribute(
        'href',
        `${SITE_URL}/`,
      );
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
        'href',
        `${SITE_URL}/en/`,
      );
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
        'href',
        `${SITE_URL}/`,
      );
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
        'content',
        locale === 'cs' ? 'cs_CZ' : 'en_US',
      );
      const og = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(og).toMatch(new RegExp(`^${SITE_URL}/`));
      // the absolute production URL, fetched from the local preview
      const res = await request.get(new URL(og ?? '').pathname);
      expect(res.status()).toBe(200);
      const meta = await sharp(await res.body()).metadata();
      // 1200 × 630 from any photo at least 1200 px wide; the placeholder hero (960 × 640) gives the largest crop
      // with the same ratio, Astro never upscales. The meta tags state the real size.
      const hero = await sharp(`src/assets/photos/${PLACEMENT.hero}.jpg`).metadata();
      expect([meta.width, meta.height]).toEqual(Object.values(ogSize(hero)));
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
        'content',
        String(meta.width),
      );
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
        'content',
        String(meta.height),
      );
      // JSON-LD is valid JSON with a Person and a ProfessionalService
      const ld = JSON.parse(
        (await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '',
      ) as { '@type': string }[];
      expect(ld.map((n) => n['@type'])).toEqual(['Person', 'ProfessionalService']);
    });
  }

  test('sitemap lists both home pages with alternates and no drafts', async ({ request }) => {
    const index = await (await request.get('/sitemap-index.xml')).text();
    const loc = /<loc>([^<]+)<\/loc>/.exec(index)?.[1];
    expect(loc).toBeTruthy();
    const xml = await (await request.get(new URL(loc ?? '').pathname)).text();
    expect(xml).toContain(`<loc>${SITE_URL}/</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/en/</loc>`);
    expect(xml).toContain(`hreflang="en" href="${SITE_URL}/en/"`);
    expect(xml).toContain(`hreflang="cs" href="${SITE_URL}/"`);
    expect(xml).toContain(`<loc>${SITE_URL}/zasady-ochrany-osobnich-udaju/</loc>`);
    // src/content/case-studies/example.md is a draft
    expect(xml).not.toContain('pripadove-studie');
    expect(xml).not.toContain('case-studies');
    expect(xml).not.toContain('404');
  });

  test('robots.txt points to the sitemap', async ({ request }) => {
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain(`Sitemap: ${SITE_URL}/sitemap-index.xml`);
  });

  test('a draft case study has no page', async ({ request }) => {
    expect((await request.get('/pripadove-studie/example/')).status()).toBe(404);
    expect((await request.get('/en/case-studies/example/')).status()).toBe(404);
  });
});

test('unknown path returns 404 with a Czech page', async ({ page }) => {
  const res = await page.goto('/neexistuje');
  expect(res?.status()).toBe(404);
  await expect(page.locator('html')).toHaveAttribute('lang', 'cs');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await expect(page.locator('main a[href="/"]').first()).toBeVisible();
});

for (const [path, locale] of [
  ['/zasady-ochrany-osobnich-udaju/', 'cs'],
  ['/en/privacy/', 'en'],
] as const) {
  test(`privacy page ${path}`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    const main = page.locator('main');
    const text = (await main.innerText()).replace(/\s+/g, ' ');
    expect(text).toContain('TODO');
    expect(text).toContain('Turnstile');
    expect(text).toContain('Cloudflare');
    expect(text).toContain('Umami');
    expect(text).toContain('Cloudflare Web Analytics');
    expect(text).toContain('foto@martinruzek.cz');
    expect(text).toContain(PRIVACY_NOTICE_VERSION);
    expect(ANONYMIZE_AFTER_DAYS).toBe(365);
    expect(text).toMatch(
      locale === 'cs' ? /anonymiz\w* po 12 měsících/i : /anonymi[sz]e (it )?after 12 months/i,
    );
    // canonical and the counterpart in the other language
    await expect(page.locator('link[rel="alternate"][hreflang="cs"]')).toHaveAttribute(
      'href',
      `${SITE_URL}/zasady-ochrany-osobnich-udaju/`,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      `${SITE_URL}/en/privacy/`,
    );
    // the header links back to the home page, not to anchors that do not exist here
    const hrefs = await page
      .locator('header.top a')
      .evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    for (const h of hrefs) expect(h?.startsWith('#')).toBe(false);
  });
}

// the text pages: WCAG 2.2 AA and no horizontal scroll at 360 px
for (const path of ['/zasady-ochrany-osobnich-udaju/', '/en/privacy/', '/neexistuje']) {
  test(`axe and 360 px ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(path);
    const [sw, cw] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(sw).toBeLessThanOrEqual(cw);
    const r = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(r.violations).toEqual([]);
  });
}
