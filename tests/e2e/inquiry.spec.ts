import { test, expect, type Page, type Route } from '@playwright/test';

// The inquiry form island (tasks 10 and 11). The endpoint is mocked with page.route where a failure has to be
// forced (network down, server error, slow response); one test sends to the real endpoint, and the endpoint
// itself is covered by inquiry-api.spec.ts.

const HOME = { cs: '/', en: '/en/' } as const;
const PRIVACY = { cs: '/zasady-ochrany-osobnich-udaju/', en: '/en/privacy/' } as const;

// Turnstile stand-in: same API, issues a token at once (and a new one after reset), never touches the network
const FAKE_TURNSTILE = `(function () {
  var opts, n = 0;
  function issue() { setTimeout(function () { opts.callback('test-token-' + n++); }, 10); }
  window.turnstile = {
    render: function (el, o) { opts = o; issue(); return 'w1'; },
    reset: function () { issue(); }, remove: function () {}
  };
})();`;

const plain = (s: string | null): string => (s ?? '').replace(/[\u00A0\u202F]/g, ' ').replace(/\u200B/g, '');

async function open(page: Page, path: string = HOME.cs): Promise<string[]> {
  const turnstile: string[] = [];
  await page.route('https://challenges.cloudflare.com/**', (r) => {
    turnstile.push(r.request().url());
    return r.fulfill({ contentType: 'text/javascript', body: FAKE_TURNSTILE });
  });
  await page.goto(path);
  return turnstile;
}

async function toForm(page: Page): Promise<void> {
  await page.locator('#inq').scrollIntoViewIfNeeded();
  await expect(page.locator('#inq button[type="submit"]')).toBeEnabled(); // hydrated
}

async function fillRequired(page: Page): Promise<void> {
  await page.getByLabel('Jméno').fill('Jana Nováková');
  await page.getByLabel('E-mail').fill('jana@example.com');
}

const ok = (r: Route) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
test.describe('inquiry form', () => {
  test('estimate follows the type, hours and add-ons', async ({ page }) => {
    await open(page);
    await toForm(page);
    const est = page.locator('.est output');
    await page.getByLabel('Délka akce (hodiny)').fill('3');
    await expect.poll(async () => plain(await est.textContent())).toBe('4 200–5 070 Kč');
    await page.getByLabel('Co fotíme').selectOption('match');
    await expect(page.getByLabel('Délka akce (hodiny)')).toBeHidden();
    await expect.poll(async () => plain(await est.textContent())).toBe('1 800–3 250 Kč');
    await page.getByLabel(/Výběr na sítě týž den/).uncheck();
    await expect.poll(async () => plain(await est.textContent())).toBe('1 500–2 500 Kč');
  });

  test('empty submit focuses the name and links the error', async ({ page }) => {
    // what a screen reader gets at the moment of focus: the description must already be there (FM-08)
    await page.addInitScript(() => {
      const w = window as unknown as { __focus: (string | null)[] };
      w.__focus = [];
      document.addEventListener('focusin', (e) => {
        const id = (e.target as Element).getAttribute('aria-describedby');
        w.__focus.push(id && document.getElementById(id) ? document.getElementById(id)!.textContent : null);
      });
    });
    await open(page);
    await toForm(page);
    await page.locator('#inq button[type="submit"]').click();
    const name = page.getByLabel('Jméno');
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    const msgId = await name.getAttribute('aria-describedby');
    expect(msgId).toBeTruthy();
    await expect(page.locator(`#${msgId}`)).toHaveText(/komu odpovídám/);
    const atFocus = await page.evaluate(() => (window as unknown as { __focus: (string | null)[] }).__focus);
    expect(atFocus.at(-1)).toMatch(/komu odpovídám/);
  });

  test('the alert region is in the accessibility tree before a message arrives (FM-08)', async ({ page }) => {
    await open(page);
    await toForm(page);
    await expect(page.getByRole('alert')).toBeAttached();
    expect(await page.getByRole('alert').evaluate((el) => getComputedStyle(el).display)).not.toBe('none');
  });

  test('a focused add-on shows a focus ring (FM-08)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'keyboard');
    await open(page);
    await toForm(page);
    await page.getByLabel(/Co mám vědět/).focus();
    await page.keyboard.press('Shift+Tab'); // the last add-on
    const tick = page.locator('.tick').filter({ has: page.locator('input:focus-visible') });
    await expect(tick).toHaveCount(1);
    expect(await tick.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
  });

  test('text the browser cannot parse in a number field is an error (FM-09)', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/inquiry', (r) => (calls++, ok(r)));
    await open(page);
    await toForm(page);
    await fillRequired(page);
    await page.getByLabel(/Počet lidí/).pressSequentially('1e'); // the value reads as ""
    await page.getByLabel(/Počet lidí/).press('Enter'); // submit without leaving the field
    await expect(page.getByLabel(/Počet lidí/)).toBeFocused();
    await expect(page.getByLabel(/Počet lidí/)).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toBe(0);
  });

  test('a double click sends a single request', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/inquiry', async (r) => {
      calls++;
      await new Promise((res) => setTimeout(res, 400));
      return ok(r);
    });
    await open(page);
    await toForm(page);
    await fillRequired(page);
    await page.locator('#inq button[type="submit"]').dblclick();
    await expect(page.locator('.done')).toBeVisible();
    expect(calls).toBe(1);
    // a sent inquiry cannot be sent again until "send another" (FM-03)
    const submit = page.locator('#inq button[type="submit"]');
    await expect(submit).toBeDisabled();
    // hovering the disabled button keeps its label readable (BR-01: the hover colour matched the background)
    const colours = () =>
      submit.evaluate((el) => [getComputedStyle(el).color, getComputedStyle(el).backgroundColor]);
    await page.mouse.move(0, 0); // the double click left the pointer on the button
    await page.waitForTimeout(500); // the colour transition is 0.3 s
    const before = await colours();
    await submit.hover({ force: true });
    await page.waitForTimeout(500); // the colour transition is 0.3 s
    expect(await colours()).toEqual(before);
  });

  test('a retry after a lost response reuses the submission id, a new inquiry gets a new one (FM-03)', async ({
    page,
  }) => {
    const ids: string[] = [];
    await page.route('**/api/inquiry', (r) => {
      ids.push((r.request().postDataJSON() as { submissionId: string }).submissionId);
      return ids.length === 1 ? r.abort() : ok(r); // the first response never arrives
    });
    await open(page);
    await toForm(page);
    await fillRequired(page);
    await page.locator('#inq button[type="submit"]').click();
    await expect(page.getByRole('alert')).toHaveText(/připojení/);
    await page.locator('#inq button[type="submit"]').click();
    await expect(page.locator('.done')).toBeVisible();
    await page.locator('.done button').click();
    await fillRequired(page);
    await page.locator('#inq button[type="submit"]').click();
    await expect(page.locator('.done')).toBeVisible();
    expect(ids).toHaveLength(3);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[0]);
  });

  test('Turnstile that never loads ends in the verification error, values kept (FM-07)', async ({ page }) => {
    await page.route('https://challenges.cloudflare.com/**', () => {}); // hangs forever
    await page.goto(HOME.cs);
    await toForm(page);
    await fillRequired(page);
    await page.locator('#inq button[type="submit"]').click();
    await expect(page.getByRole('alert')).toHaveText(/ověřit/, { timeout: 15_000 });
    await expect(page.getByLabel('Jméno')).toHaveValue('Jana Nováková');
    await expect(page.locator('#inq button[type="submit"]')).toBeEnabled();
  });

  for (const failure of ['network', 'server', 'unknown shape'] as const) {
    test(`${failure} failure shows an alert and keeps the values`, async ({ page }) => {
      await page.route(
        '**/api/inquiry',
        (r) =>
          failure === 'network'
            ? r.abort()
            : failure === 'server'
              ? r.fulfill({ status: 500, body: 'oops' })
              : r.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false}' }), // FM-07
      );
      await open(page);
      await toForm(page);
      await fillRequired(page);
      await page.getByLabel(/Co mám vědět/).fill('Program večera');
      await page.locator('#inq button[type="submit"]').click();
      await expect(page.getByRole('alert')).toHaveText(failure === 'network' ? /připojení/ : /chybě na mé straně/);
      await expect(page.getByLabel('Jméno')).toHaveValue('Jana Nováková');
      await expect(page.getByLabel(/Co mám vědět/)).toHaveValue('Program večera');
      await expect(page.locator('#inq button[type="submit"]')).toBeEnabled();
    });
  }

  test('"Spočítat cenu" at Sport preselects the match', async ({ page }) => {
    await open(page);
    const link = page.locator('a[href*="sluzba=match"]').first();
    // the service cards rise in when scrolled to; a click during that entrance lands on the moving card
    await link.scrollIntoViewIfNeeded();
    const card = page.locator('.svc').filter({ has: link });
    await expect(card).toHaveCSS('opacity', '1');
    await expect(card).toHaveCSS('transform', /^(none|matrix\(1, 0, 0, 1, 0, 0\))$/); // GSAP ends on identity
    await link.click();
    await expect(page.getByLabel('Co fotíme')).toHaveValue('match');
  });

  test('Turnstile loads only near the form', async ({ page }) => {
    const turnstile = await open(page);
    await page.waitForTimeout(1000);
    expect(turnstile).toHaveLength(0);
    await toForm(page);
    await expect.poll(() => turnstile.length).toBeGreaterThan(0);
    expect(turnstile[0]).toContain('render=explicit');
  });

  for (const locale of ['cs', 'en'] as const) {
    test(`no consent checkbox, privacy sentence above the button (${locale})`, async ({ page }) => {
      await open(page, HOME[locale]);
      await toForm(page);
      const boxes = page.locator('#inq input[type="checkbox"]');
      await expect(boxes).toHaveCount(2);
      for (const name of await boxes.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).name)))
        expect(name).toBe('addons');
      const link = page.locator('#inq .privacy a');
      await expect(link).toHaveAttribute('href', PRIVACY[locale]);
      const [p, b] = await Promise.all([
        page.locator('#inq .privacy').boundingBox(),
        page.locator('#inq button[type="submit"]').boundingBox(),
      ]);
      expect(p!.y).toBeLessThan(b!.y);
    });
  }

  test('Umami events on success and on error', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as {
        __ev: unknown[];
        umami: { track(e: string, d?: unknown): void };
      };
      w.__ev = [];
      w.umami = { track: (e, d) => w.__ev.push(d === undefined ? [e] : [e, d]) };
    });
    let fail = true;
    await page.route('**/api/inquiry', (r) => (fail ? r.fulfill({ status: 500, body: '' }) : ok(r)));
    await open(page);
    await toForm(page);
    await fillRequired(page);
    await page.locator('#inq button[type="submit"]').click();
    await expect(page.getByRole('alert')).not.toBeEmpty();
    fail = false;
    await page.locator('#inq button[type="submit"]').click();
    await expect(page.locator('.done')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __ev: unknown[] }).__ev)).toEqual([
      ['inquiry_error'],
      ['inquiry_sent', { service: 'event' }],
    ]);
  });

  test('longest EN estimate fits at 360 px (12 h, both add-ons)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await open(page, HOME.en);
    await toForm(page);
    await page.getByLabel('Event length (hours)').fill('12');
    await page.getByLabel(/Vertical videos/).check();
    await expect.poll(async () => plain(await page.locator('.est output').textContent())).toBe('CZK 16,000–21,110');
    const [sw, cw] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(sw).toBeLessThanOrEqual(cw);
    const box = await page.locator('.est').boundingBox();
    const out = await page.locator('.est output').evaluate((el) => el.scrollWidth <= el.clientWidth);
    expect(box!.x + box!.width).toBeLessThanOrEqual(360);
    expect(out).toBe(true);
  });

  // the real endpoint (wrangler dev, local D1, Turnstile test keys); desktop only because of the rate limit
  test('sends to the real endpoint', async ({ page, context }, info) => {
    test.skip(info.project.name !== 'desktop', 'rate limited endpoint: once per run');
    await page.goto(HOME.cs); // the real Turnstile widget with the public test site key
    await toForm(page);
    await fillRequired(page);
    await page.locator('#inq button[type="submit"]').click();
    await expect(page.locator('.done')).toBeVisible({ timeout: 15_000 });
    // our page and endpoint set no cookies and write nothing to storage (FM-12); Turnstile's own iframe is
    // Cloudflare's, so only cookies for this origin count
    expect(await context.cookies(page.url())).toEqual([]);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  });
});
