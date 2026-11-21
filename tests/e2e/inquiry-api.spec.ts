import { test, expect } from '@playwright/test';

// POST /api/inquiry against the preview (wrangler dev, local D1, Turnstile test secret, console mailer).
// Desktop project only (mobile-360 sets isMobile): the endpoint is rate limited to 5 requests per IP and minute (wrangler.jsonc).
test.skip(({ isMobile }) => isMobile, 'runs once (desktop), not per viewport');

const valid = {
  name: 'Test Osoba',
  email: 'test@example.com',
  service: 'event',
  hours: 3,
  addons: ['sameDay'],
  locale: 'cs',
  // the Turnstile test secret accepts this dummy token
  turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX',
  source: { landingPath: '/' },
};

test.describe.configure({ mode: 'serial' });

test('GET is not allowed', async ({ request }) => {
  const res = await request.get('/api/inquiry');
  expect(res.status()).toBe(405);
  expect(res.headers()['allow']).toBe('POST');
});

test('a foreign origin is refused', async ({ request }) => {
  const res = await request.post('/api/inquiry', { data: valid, headers: { origin: 'https://evil.example' } });
  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ ok: false, errors: { form: 'origin' } });
});

test('an invalid e-mail comes back as a field error', async ({ request, baseURL }) => {
  const res = await request.post('/api/inquiry', {
    data: { ...valid, email: 'test@' },
    headers: { origin: new URL(baseURL!).origin },
  });
  expect(res.status()).toBe(400);
  expect((await res.json()).errors.email).toBe('invalid');
});

test('a valid inquiry is stored', async ({ request, baseURL }) => {
  const res = await request.post('/api/inquiry', { data: valid, headers: { origin: new URL(baseURL!).origin } });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(res.headers()['set-cookie']).toBeUndefined();
});

test('a filled honeypot looks like a success', async ({ request, baseURL }) => {
  const res = await request.post('/api/inquiry', {
    data: { ...valid, website: 'https://spam.example' },
    headers: { origin: new URL(baseURL!).origin },
  });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
