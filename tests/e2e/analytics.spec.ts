import { test, expect } from './fixtures';
import { ANALYTICS_TEST_ENV } from './analytics-env';
import { BEACON_COLLECT, UMAMI_COLLECT, stubAnalytics } from './analytics-stubs';

// Task 14: the measurement scripts arrive only after `load`, the attributes Umami reads produce the events, and the
// collect requests pass the CSP with nothing but the path and the UTM tags (ST-01, ST-03). The stand-ins are in
// analytics-stubs.ts.

test('Umami and the Cloudflare beacon load only after the load event', async ({ page }) => {
  const { hits } = await stubAnalytics(page);
  await page.goto('/');
  await expect.poll(() => hits.length).toBe(2);
  const loadAt = await page.evaluate(() => (window as unknown as { __loadAt: number }).__loadAt);
  expect(loadAt).toBeGreaterThan(0);
  for (const h of hits) expect(h.at).toBeGreaterThanOrEqual(loadAt);
  expect(hits.map((h) => new URL(h.url).hostname).sort()).toEqual([
    'static.cloudflareinsights.com',
    'umami.test',
  ]);
  await expect(
    page.locator(`script[src="${ANALYTICS_TEST_ENV.PUBLIC_UMAMI_SRC}"]`),
  ).toHaveAttribute('data-website-id', ANALYTICS_TEST_ENV.PUBLIC_UMAMI_WEBSITE_ID);
  const beacon = await page
    .locator('script[src*="cloudflareinsights"]')
    .getAttribute('data-cf-beacon');
  expect(JSON.parse(beacon ?? '')).toEqual({ token: ANALYTICS_TEST_ENV.PUBLIC_CF_BEACON_TOKEN });
});

test('a contact click sends contact_click, opening a photo sends lightbox_open', async ({
  page,
}) => {
  await stubAnalytics(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForFunction(() => 'umami' in window);
  const calls = (): Promise<{ name: string; data: Record<string, string> | null }[]> =>
    page.evaluate(
      () =>
        (window as unknown as { __umami: { name: string; data: Record<string, string> | null }[] })
          .__umami,
    );
  // the e-mail link in the footer (on desktop a click copies the address; the event is sent all the same)
  await page.locator('footer.foot a[href^="mailto:"]').click();
  await expect.poll(calls).toContainEqual({ name: 'contact_click', data: { type: 'email' } });
  await page.locator('[data-lb]').first().click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await expect.poll(calls).toContainEqual({ name: 'lightbox_open', data: null });
});

test('the collect requests pass the CSP and carry no foreign query, hash or referrer path (ST-01, ST-03)', async ({
  page,
}) => {
  const stubs = await stubAnalytics(page);
  await page.goto(
    '/en/?email=jana%40example.test&utm_source=ig&utm_campaign=jaro#private-fragment',
    {
      referer: 'https://www.instagram.com/jana.novakova/?igsh=secret',
    },
  );
  await expect
    .poll(() => stubs.collects.map((c) => c.url).sort())
    .toEqual([BEACON_COLLECT, UMAMI_COLLECT].sort());
  expect(await stubs.violations()).toEqual([]);
  const umami = stubs.collects.find((c) => c.url === UMAMI_COLLECT);
  const sent = JSON.parse(umami?.body ?? '') as {
    type: string;
    payload: { url: string; referrer: string };
  };
  expect(sent.type).toBe('event');
  expect(sent.payload.url).toBe('/en/?utm_source=ig');
  expect(sent.payload.referrer).toBe('https://www.instagram.com');
  expect(umami?.body).not.toMatch(/email|jana|example\.test|private-fragment|igsh|secret/);
});

test('the 404 page loads no analytics, so a mistyped path never reaches Umami or Cloudflare (ST-10)', async ({
  page,
}) => {
  const stubs = await stubAnalytics(page);
  const res = await page.goto('/jana%40example.test');
  expect(res?.status()).toBe(404);
  await page.waitForLoadState('load');
  // the loader waits for load + idle; give it well over that before checking nothing was requested
  await page.waitForTimeout(1500);
  expect(stubs.hits).toEqual([]);
  expect(stubs.collects).toEqual([]);
  await expect(page.locator('#analytics-config')).toHaveCount(0);
});
