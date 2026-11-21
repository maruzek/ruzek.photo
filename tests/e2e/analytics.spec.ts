import { test, expect, type Page } from '@playwright/test';
import { ANALYTICS_TEST_ENV } from './analytics-env';

// Task 14: the measurement scripts arrive only after `load`, and the attributes Umami reads produce the events.
// The Umami stand-in records calls and handles `data-umami-event` clicks the way the real tracker does
// (name from the attribute, properties from `data-umami-event-*`).
const UMAMI_STUB = `(function () {
  var calls = (window.__umami = []);
  window.umami = { track: function (name, data) { calls.push({ name: name, data: data || null }); } };
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-umami-event]');
    if (!el) return;
    var data = {};
    for (var a of el.attributes) if (a.name.indexOf('data-umami-event-') === 0) data[a.name.slice(17)] = a.value;
    e.preventDefault();
    window.umami.track(el.getAttribute('data-umami-event'), data);
  }, true);
})();`;

interface Hit {
  url: string;
  at: number;
}

async function stubAnalytics(page: Page): Promise<Hit[]> {
  const hits: Hit[] = [];
  await page.route(ANALYTICS_TEST_ENV.PUBLIC_UMAMI_SRC, (r) => {
    hits.push({ url: r.request().url(), at: Date.now() });
    return r.fulfill({ contentType: 'text/javascript', body: UMAMI_STUB });
  });
  await page.route('https://static.cloudflareinsights.com/**', (r) => {
    hits.push({ url: r.request().url(), at: Date.now() });
    return r.fulfill({ contentType: 'text/javascript', body: '' });
  });
  await page.addInitScript(() => {
    addEventListener(
      'load',
      () => ((window as unknown as { __loadAt: number }).__loadAt = Date.now()),
    );
  });
  return hits;
}

test('Umami and the Cloudflare beacon load only after the load event', async ({ page }) => {
  const hits = await stubAnalytics(page);
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
  // the phone number is still a TODO, so the e-mail is the contact link
  await page.locator('footer.foot a[href^="mailto:"]').click();
  await expect.poll(calls).toContainEqual({ name: 'contact_click', data: { type: 'email' } });
  await page.locator('[data-lb]').first().click();
  await expect(page.locator('dialog[open]')).toBeVisible();
  await expect.poll(calls).toContainEqual({ name: 'lightbox_open', data: null });
});
