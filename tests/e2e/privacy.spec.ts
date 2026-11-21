import { test, expect, type Route } from '@playwright/test';
import { BEACON_COLLECT, UMAMI_COLLECT, stubAnalytics } from './analytics-stubs';

// Task 14 / concept.md, kap. 15: with measurement on (the e2e build has it, tests/e2e/analytics-env.ts), loading,
// scrolling to the end, opening the lightbox and sending the form leave no cookies and nothing in localStorage, and
// there is no cookie banner. The responses carry the security headers, and no iframe except Turnstile exists.

const FAKE_TURNSTILE = `window.turnstile = { render: function (el, o) { setTimeout(function () { o.callback('t'); }, 10); return 'w'; }, reset: function () {}, remove: function () {} };`;
const ok = (r: Route) =>
  r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });

test('no cookies, no storage, no banner after a full visit', async ({ page, context }) => {
  await page.route('https://challenges.cloudflare.com/**', (r) =>
    r.fulfill({ contentType: 'text/javascript', body: FAKE_TURNSTILE }),
  );
  // working tracker stand-ins that send their collect requests (ST-08): storage is checked after they ran
  const stubs = await stubAnalytics(page);
  await page.route('**/api/inquiry', ok);
  await page.goto('/');
  await page.waitForLoadState('load');
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 30));
    }
  });
  await page.locator('[data-lb]').first().click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#inq').scrollIntoViewIfNeeded();
  await expect(page.locator('#inq button[type="submit"]')).toBeEnabled();
  await page.getByLabel('Jméno').fill('Jana Nováková');
  await page.getByLabel('E-mail').fill('jana@example.com');
  await page.locator('#inq button[type="submit"]').click();
  await expect(page.locator('#inq')).toContainText('Díky');
  // both trackers loaded and reported (page view, the lightbox and form events)
  await expect
    .poll(() => new Set(stubs.collects.map((c) => c.url)))
    .toEqual(new Set([UMAMI_COLLECT, BEACON_COLLECT]));
  await expect
    .poll(() => stubs.collects.filter((c) => c.url === UMAMI_COLLECT).length)
    .toBeGreaterThanOrEqual(3);
  expect(await stubs.violations()).toEqual([]);

  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(await page.evaluate(() => document.cookie)).toBe('');
  await expect(page.getByText(/cookie/i).filter({ visible: true })).toHaveCount(0);
  const frames = await page
    .locator('iframe')
    .evaluateAll((els) => els.map((e) => (e as HTMLIFrameElement).src));
  for (const src of frames) expect(src).toMatch(/^https:\/\/challenges\.cloudflare\.com\//);
});

for (const path of ['/', '/en/', '/zasady-ochrany-osobnich-udaju/']) {
  test(`security headers on ${path}`, async ({ request }) => {
    const res = await request.get(path);
    const h = res.headers();
    const csp = h['content-security-policy'] ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain('https://challenges.cloudflare.com');
    expect(csp).toMatch(/script-src [^;]*'sha256-/);
    expect(csp).not.toMatch(/script-src [^;]*'unsafe-inline'/);
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['permissions-policy']).toContain('camera=()');
    expect(h['set-cookie']).toBeUndefined();
  });
}

test('the hashed assets keep the adapter cache header next to the security headers', async ({
  page,
  request,
}) => {
  await page.goto('/');
  const asset = await page
    .locator('script[type="module"][src^="/_astro/"]')
    .first()
    .getAttribute('src');
  const h = (await request.get(asset ?? '')).headers();
  expect(h['cache-control']).toContain('immutable');
  expect(h['x-content-type-options']).toBe('nosniff');
});

test('every inline script the pages run is allowed by the CSP (no violations)', async ({
  page,
}) => {
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy/i.test(m.text())) violations.push(m.text());
  });
  for (const path of ['/', '/en/', '/zasady-ochrany-osobnich-udaju/', '/neexistuje']) {
    await page.goto(path);
    await page.waitForLoadState('load');
  }
  expect(violations).toEqual([]);
});
